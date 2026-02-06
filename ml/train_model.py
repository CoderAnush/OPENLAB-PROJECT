"""
Random Forest Model Training for Gas/Smoke Early Warning System
===============================================================

GOAL: Train a classifier to predict SAFE/WARN/CRITICAL 
based on sensor trends BEFORE threshold crossing

WHY RANDOM FOREST?
- Handles non-linear sensor patterns
- Feature importance reveals what drives predictions
- Robust to outliers
- Fast inference (suitable for real-time embedded systems)

"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

print("="*70)
print("ML MODEL TRAINING: Random Forest Classifier")
print("="*70)

# ========== LOAD FEATURE-ENGINEERED DATA ==========
print("\n📂 Loading feature-engineered datasets...")
ml_dir = 'ml_features'

if not os.path.exists(f'{ml_dir}/train_features.csv'):
    print(" ERROR: Run feature_engineering.py first!")
    print(" Command: python ml/feature_engineering.py")
    exit(1)

train_df = pd.read_csv(f'{ml_dir}/train_features.csv')
test_df = pd.read_csv(f'{ml_dir}/test_features.csv')

X_train = train_df.drop(columns=['label'])
y_train = train_df['label']
X_test = test_df.drop(columns=['label'])
y_test = test_df['label']

print(f"✅ Training samples: {len(X_train)}")
print(f"✅ Testing samples:  {len(X_test)}")
print(f"✅ Features: {list(X_train.columns)}\n")

# ========== LABEL DISTRIBUTION ==========
print("Label Distribution (Train):")
for label in sorted(y_train.unique()):
    count = sum(y_train == label)
    pct = 100 * count / len(y_train)
    print(f"   {label:10s}: {count:4d} ({pct:5.1f}%)")

print("\nLabel Distribution (Test):")
for label in sorted(y_test.unique()):
    count = sum(y_test == label)
    pct = 100 * count / len(y_test)
    print(f"   {label:10s}: {count:4d} ({pct:5.1f}%)")

# ========== MODEL TRAINING ==========
print("\n" + "="*70)
print("🌲 TRAINING Random Forest Classifier...")
print("="*70)

rf_model = RandomForestClassifier(
    n_estimators=150,          # 150 trees for robustness
    max_depth=12,              # Depth limited to prevent overfitting
    min_samples_split=15,      # At least 15 samples to split
    min_samples_leaf=5,        # At least 5 samples in leaf
    random_state=42,
    n_jobs=-1,                 # Use all CPU cores
    class_weight='balanced',   # Handle class imbalance
    oob_score=True             # Out-of-bag validation
)

print("Training model...")
rf_model.fit(X_train, y_train)
print("✅ Model trained successfully!\n")

# ========== TRAINING ACCURACY ==========
train_score = rf_model.score(X_train, y_train)
train_pred = rf_model.predict(X_train)
test_score = rf_model.score(X_test, y_test)
test_pred = rf_model.predict(X_test)
print(f"📊 Training Accuracy:  {train_score:.4f} ({int(train_score*len(X_train))}/{len(X_train)} correct)")
print(f"📊 Test Accuracy:     {test_score:.4f} ({int(test_score*len(X_test))}/{len(X_test)} correct)")
print(f"📊 OOB Score:         {rf_model.oob_score_:.4f}")

# ========== CROSS-VALIDATION ==========
print("\n🔄 Cross-Validation (5-fold Stratified):")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(rf_model, X_train, y_train, cv=cv, scoring='accuracy')
print(f"   Scores: {[f'{s:.4f}' for s in cv_scores]}")
print(f"   Mean:   {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ========== DETAILED EVALUATION ==========
print("\n" + "="*70)
print("📋 DETAILED CLASSIFICATION REPORT (Test Set)")
print("="*70)
print(classification_report(y_test, test_pred, digits=4))

print("\nConfusion Matrix (Test Set):")
cm = confusion_matrix(y_test, test_pred, labels=['SAFE', 'WARN', 'CRITICAL'])
print(f"        Predicted")
print(f"        SAFE  WARN  CRIT")
labels = ['SAFE', 'WARN', 'CRIT']
for i, label in enumerate(labels):
    print(f"Actual {label}: {cm[i]}")

# Per-class recall (important for safety)
print("\nPer-Class Recall (True Positive Rate):")
for i, label in enumerate(['SAFE', 'WARN', 'CRITICAL']):
    if cm[i].sum() > 0:
        recall = cm[i, i] / cm[i].sum()
        print(f"   {label:10s}: {recall:.4f} (detected {cm[i,i]} out of {cm[i].sum()})")

# ========== FEATURE IMPORTANCE ==========
print("\n" + "="*70)
print("🎯 FEATURE IMPORTANCE (What drives predictions?)")
print("="*70)
feature_importance = pd.DataFrame({
    'feature': X_train.columns,
    'importance': rf_model.feature_importances_
}).sort_values('importance', ascending=False)

total_importance = feature_importance['importance'].sum()
feature_importance['percentage'] = 100 * feature_importance['importance'] / total_importance

print("\nTop Features:")
for idx, row in feature_importance.iterrows():
    bar_width = int(row['percentage'] / 2)
    bar = '█' * bar_width
    print(f"   {row['feature']:20s}: {row['percentage']:5.1f}% {bar}")

# ========== MODEL FREEZING & DEPLOYMENT ==========
print("\n" + "="*70)
print("💾 STEP 2: FREEZING MODEL (Deployment Ready)")
print("="*70)

model_path = 'ml_models/gas_smoke_rf.pkl'
os.makedirs('ml_models', exist_ok=True)

joblib.dump(rf_model, model_path)
print(f"\n✅ Model saved: {model_path}")
print(f"   Size: {os.path.getsize(model_path) / 1024:.1f} KB")

# Save feature names for deployment (CRITICAL)
feature_names = X_train.columns.tolist()
joblib.dump(feature_names, 'ml_models/feature_names.pkl')
print(f"✅ Feature names saved: ml_models/feature_names.pkl")

# Create metadata file
metadata = {
    'model_type': 'RandomForestClassifier',
    'n_estimators': rf_model.n_estimators,
    'classes': sorted(y_train.unique()),
    'features': feature_names,
    'training_accuracy': float(train_score),
    'test_accuracy': float(test_score),
    'num_training_samples': len(X_train),
    'num_test_samples': len(X_test),
    'timestamp': pd.Timestamp.now().isoformat()
}

import json
with open('ml_models/model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"✅ Metadata saved: ml_models/model_metadata.json")

# ========== DEPLOYMENT EXPLANATION ==========
print("\n" + "="*70)
print("🚀 DEPLOYMENT ARCHITECTURE")
print("="*70)
print("""
Model Location: gas_smoke_rf.pkl (deployed on PC, NOT on STM32)
├─ Weights are FROZEN (no retraining in production)
├─ Loads feature_names.pkl to ensure feature consistency
└─ Receives streaming sensor data from STM32 over UART

Real-Time Inference Flow:
1. STM32 sends: "MQ2: 1.5, MQ135: 0.8"
2. PC extracts features (IDENTICAL to training)
3. Random Forest predicts: SAFE / WARN / CRITICAL
4. PC sends AI command back to STM32: "AI_WARN"
5. STM32 acts: Fan ON (early prevention)
6. Threshold protection remains active (fail-safe)

Why Random Forest?
✓ Fast inference (< 5 ms per prediction)
✓ Interpretable (feature importance)
✓ Handles non-linear patterns
✓ No GPU required (runs on PC CPU)
✓ Proven in IoT systems
""")

print("\n" + "="*70)
print("✅ TRAINING COMPLETE")
print("="*70)
print(f"\nNext step: python ml/deploy_inference.py")
print("This will start the real-time inference loop")
