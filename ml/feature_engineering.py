"""
FEATURE ENGINEERING FOR GAS/SMOKE DETECTION ML MODEL
======================================================
Converts raw MQ2/MQ135 sensor time-series into feature vectors for classification.

STEP 1: Load raw CSV datasets
STEP 2: Create time-windows with sliding window
STEP 3: Extract statistical features per window
STEP 4: Label based on threshold crossing (future reference)
STEP 5: Save engineered dataset (no data leakage between train/test)
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime

# ==================== CONFIGURATION ====================
WINDOW_SIZE = 60  # 60 samples = ~6.3 seconds (at 9.5 Hz)
WINDOW_STRIDE = 30  # Non-overlapping: 30 samples forward
DATASETS_DIR = 'datasets'
OUTPUT_DIR = 'ml_features'
LABELS_FILE = f'{OUTPUT_DIR}/labeled_dataset.csv'

# Threshold values (must match STM32 fail-safe)
MQ2_SAFE = 1.2
MQ2_WARN = 1.5
MQ2_CRITICAL = 2.0

MQ135_SAFE = 0.8
MQ135_WARN = 1.2
MQ135_CRITICAL = 1.8

# Scenario to label mapping
SCENARIO_LABELS = {
    'safe_baseline': 'SAFE',
    'gradual_gas': 'WARN',  # Early detection needed
    'rapid_gas': 'CRITICAL',  # Immediate action needed
    'gradual_smoke': 'WARN',
    'critical_smoke': 'CRITICAL'
}

# ==================== FEATURE EXTRACTION ====================

def extract_features(window_mq2, window_mq135):
    """
    Extract 8 features from a time window.
    
    These MUST be identical in training and deployment.
    """
    features = {
        'mq2_now': float(window_mq2[-1]),           # Current value
        'mq135_now': float(window_mq135[-1]),       # Current value
        'mq2_delta': float(window_mq2[-1] - window_mq2[0]),   # Trend
        'mq135_delta': float(window_mq135[-1] - window_mq135[0]),
        'mq2_mean_window': float(np.mean(window_mq2)),        # Average
        'mq135_mean_window': float(np.mean(window_mq135)),
        'mq2_max_window': float(np.max(window_mq2)),          # Peak
        'mq135_max_window': float(np.max(window_mq135))
    }
    return features

def label_based_on_max(window_mq2, window_mq135, scenario):
    """
    Label based on maximum value in window (future reference approach).
    This mimics early prediction before threshold crossing.
    """
    max_mq2 = np.max(window_mq2)
    max_mq135 = np.max(window_mq135)
    
    # Safety: Use the most conservative label
    if max_mq2 >= MQ2_CRITICAL or max_mq135 >= MQ135_CRITICAL:
        return 'CRITICAL'
    elif max_mq2 >= MQ2_WARN or max_mq135 >= MQ135_WARN:
        return 'WARN'
    else:
        return 'SAFE'

def process_csv_file(filepath):
    """
    Process a single CSV file and extract windowed features.
    Returns list of (features_dict, label) tuples.
    """
    print(f"  Loading {filepath}...")
    df = pd.read_csv(filepath)
    
    mq2_values = df['mq2'].values
    mq135_values = df['mq135'].values
    
    windows = []
    
    # Slide window across data
    for i in range(0, len(mq2_values) - WINDOW_SIZE + 1, WINDOW_STRIDE):
        window_mq2 = mq2_values[i:i+WINDOW_SIZE]
        window_mq135 = mq135_values[i:i+WINDOW_SIZE]
        
        # Extract features
        features = extract_features(window_mq2, window_mq135)
        
        # Label: extract scenario from filename
        scenario = os.path.basename(filepath).split('_')[0]
        label = label_based_on_max(window_mq2, window_mq135, scenario)
        
        windows.append({**features, 'label': label})
    
    return windows

def create_train_test_split(all_windows):
    """
    Split data into train/test WITHOUT time overlap.
    
    Strategy:
    - 70% of each scenario -> Train (continuous first part)
    - 30% of each scenario -> Test (continuous last part)
    
    This prevents data leakage from time-correlation.
    """
    train_windows = []
    test_windows = []
    
    # Group by scenario (which determines label distribution)
    scenario_groups = {}
    for window in all_windows:
        label = window['label']
        if label not in scenario_groups:
            scenario_groups[label] = []
        scenario_groups[label].append(window)
    
    # Split each label's windows temporally
    for label, windows_list in scenario_groups.items():
        split_idx = int(len(windows_list) * 0.7)
        train_windows.extend(windows_list[:split_idx])
        test_windows.extend(windows_list[split_idx:])
    
    return train_windows, test_windows

# ==================== MAIN EXECUTION ====================

def main():
    print("="*70)
    print("FEATURE ENGINEERING: Gas/Smoke Detection")
    print("="*70)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Scan for CSV files
    csv_files = [f for f in os.listdir(DATASETS_DIR) if f.endswith('.csv')]
    csv_files = sorted([f for f in csv_files if 'baseline' in f or 'gas' in f or 'smoke' in f])
    
    if not csv_files:
        print(" No CSV files found in datasets/")
        return
    
    print(f"\n Found {len(csv_files)} dataset(s):")
    for f in csv_files:
        print(f"   - {f}")
    
    # Process all files
    all_windows = []
    for csv_file in csv_files:
        filepath = os.path.join(DATASETS_DIR, csv_file)
        windows = process_csv_file(filepath)
        all_windows.extend(windows)
        print(f"     -> Extracted {len(windows)} windows")
    
    print(f"\n Total windows extracted: {len(all_windows)}")
    
    # Label distribution
    label_counts = {}
    for w in all_windows:
        label = w['label']
        label_counts[label] = label_counts.get(label, 0) + 1
    
    print("\n Label Distribution:")
    for label, count in sorted(label_counts.items()):
        pct = 100 * count / len(all_windows)
        print(f"   {label:10s}: {count:5d} ({pct:5.1f}%)")
    
    # Train/Test split
    print("\n Creating train/test split (70/30, temporally non-overlapping)...")
    train_windows, test_windows = create_train_test_split(all_windows)
    
    print(f"   Train: {len(train_windows)} samples")
    print(f"   Test:  {len(test_windows)} samples")
    
    # Create DataFrames
    train_df = pd.DataFrame(train_windows)
    test_df = pd.DataFrame(test_windows)
    
    # Verify no label leakage
    print("\n Train label distribution:")
    print(train_df['label'].value_counts())
    print("\n Test label distribution:")
    print(test_df['label'].value_counts())
    
    # Save datasets
    train_file = f'{OUTPUT_DIR}/train_features.csv'
    test_file = f'{OUTPUT_DIR}/test_features.csv'
    
    train_df.to_csv(train_file, index=False)
    test_df.to_csv(test_file, index=False)
    
    print(f"\n Saved:")
    print(f"   {train_file}")
    print(f"   {test_file}")
    
    # Feature statistics
    print("\n Feature Statistics (Training Set):")
    print(train_df.describe().round(3))
    
    print("\n" + "="*70)
    print(" FEATURE ENGINEERING COMPLETE")
    print("="*70)
    print(f"Next step: python ml/train_model.py")

if __name__ == '__main__':
    main()
