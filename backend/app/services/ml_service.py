import os
import joblib
import numpy as np
from datetime import datetime
from collections import deque
import logging

logger = logging.getLogger("MLService")

class MLService:
    def __init__(self):
        self.model = None
        self.feature_names = None
        self.model_loaded = False
        self.rolling_buffer = deque(maxlen=60)  # 60 samples for feature window
        self.total_predictions = 0
        self.last_prediction = "SAFE"
        self.last_confidence = 0.0
        self.prediction_time = None
        
        # Load the trained model
        self.load_model()
    
    def load_model(self):
        """Load the trained Random Forest model and feature names"""
        try:
            # Try multiple paths to find the model
            current_dir = os.path.dirname(os.path.abspath(__file__))  # ...backend/app/services
            project_root = os.path.abspath(os.path.join(current_dir, "../../.."))  # ...IoT-Dashboard
            
            # Possible model paths
            possible_paths = [
                os.path.join(project_root, "ml_models", "gas_smoke_rf.pkl"),
                os.path.join(current_dir, "../../ml_models/gas_smoke_rf.pkl"),
                "ml_models/gas_smoke_rf.pkl"  # Relative to CWD
            ]
            
            model_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    model_path = os.path.abspath(path)
                    break
            
            if model_path is None:
                logger.warning(f"⚠️ Model files not found in any expected location. Checked: {possible_paths}")
                self.model_loaded = False
                return
            
            feature_path = os.path.join(os.path.dirname(model_path), "feature_names.pkl")
            
            if os.path.exists(model_path) and os.path.exists(feature_path):
                self.model = joblib.load(model_path)
                self.feature_names = joblib.load(feature_path)
                self.model_loaded = True
                logger.info(f"✅ ML Model loaded successfully from {model_path}")
            else:
                logger.warning(f"⚠️ Model files not found. Model: {os.path.exists(model_path)}, Features: {os.path.exists(feature_path)}")
                self.model_loaded = False
        except Exception as e:
            logger.error(f"❌ Error loading ML model: {e}")
            self.model_loaded = False
    
    def extract_features(self, mq2_reading, mq135_reading):
        """
        Extract 8 features from current reading and rolling buffer
        Features: [mq2_now, mq135_now, mq2_delta, mq135_delta, 
                   mq2_mean_window, mq135_mean_window, mq2_max_window, mq135_max_window]
        """
        # Add current reading to buffer
        self.rolling_buffer.append((mq2_reading, mq135_reading))
        
        if len(self.rolling_buffer) < 2:
            return None  # Not enough data for features yet
        
        # Extract features
        buffer_array = np.array(list(self.rolling_buffer))
        mq2_values = buffer_array[:, 0]
        mq135_values = buffer_array[:, 1]
        
        # Feature vector (8 dimensions)
        features = [
            mq2_reading,                           # mq2_now
            mq135_reading,                         # mq135_now
            mq2_values[-1] - mq2_values[0],        # mq2_delta (Window Delta: Last - First)
            mq135_values[-1] - mq135_values[0],    # mq135_delta (Window Delta: Last - First)
            np.mean(mq2_values),                   # mq2_mean_window
            np.mean(mq135_values),                 # mq135_mean_window
            np.max(mq2_values),                    # mq2_max_window
            np.max(mq135_values),                  # mq135_max_window
        ]
        
        return np.array(features).reshape(1, -1)
    
    def predict_with_ml(self, mq2_voltage, mq135_voltage):
        """
        Predict using the trained Random Forest model
        Returns: (prediction, confidence, ai_command)
        """
        if not self.model_loaded:
            return self.predict_with_thresholds(mq2_voltage, mq135_voltage)
        
        try:
            # Extract features
            features = self.extract_features(mq2_voltage, mq135_voltage)
            
            if features is None or len(self.rolling_buffer) < 60:
                # Not enough samples yet - log status and use threshold fallback
                logger.info(f"⏳ Warming Up ({len(self.rolling_buffer)}/60 samples) -> Using Thresholds")
                return self.predict_with_thresholds(mq2_voltage, mq135_voltage)
            
            # Convert to DataFrame with feature names to avoid scikit-learn warnings
            if self.feature_names is not None:
                import pandas as pd
                features_df = pd.DataFrame(features, columns=self.feature_names)
                prediction = self.model.predict(features_df)[0]
                probabilities = self.model.predict_proba(features_df)[0]
            else:
                # Fallback if feature names not loaded
                prediction = self.model.predict(features)[0]
                probabilities = self.model.predict_proba(features)[0]
            
            confidence = float(np.max(probabilities))
            
            # Map prediction to AI command
            if confidence < 0.45:  # Lowered Threshold for more dynamic response
                ai_command = "AI_SAFE"
            else:
                ai_command = f"AI_{prediction}"
            
            # Update state
            self.total_predictions += 1
            self.last_prediction = prediction
            self.last_confidence = confidence
            
            # approximate probabilities for 3 classes if model is binary or just use confidence logic
            if prediction == "SAFE":
                self.last_probs = {"safe": confidence, "warn": (1-confidence)/2, "crit": (1-confidence)/2}
            elif prediction == "WARN":
                self.last_probs = {"safe": (1-confidence)/2, "warn": confidence, "crit": (1-confidence)/2}
            else:
                self.last_probs = {"safe": (1-confidence)/2, "warn": (1-confidence)/2, "crit": confidence}
                
            self.prediction_time = datetime.now()
            
            logger.info(f"🤖 Prediction: {prediction} (confidence: {confidence:.2%}) -> {ai_command}")
            
            return prediction, confidence, ai_command
        
        except Exception as e:
            logger.error(f"❌ ML Prediction Error: {e}")
            return self.predict_with_thresholds(mq2_voltage, mq135_voltage)

    def predict_future_trends(self):
        """
        Estimate seconds until Warning (1.5V) and Critical (2.0V).
        Returns: dict with times and probability distribution
        """
        try:
            if len(self.rolling_buffer) < 10:
                return None
            
            # Get last 10 samples of MQ2 (index 0) and MQ135 (index 1) - use max of both
            # actually risk is usually driven by the max of either sensor
            recent_mq2 = np.array(list(self.rolling_buffer))[-10:, 0]
            recent_mq135 = np.array(list(self.rolling_buffer))[-10:, 1]
            
            # Use the sensor that is higher/growing faster
            if np.mean(recent_mq2) > np.mean(recent_mq135):
                y = recent_mq2
            else:
                y = recent_mq135
                
            # Simple Linear Regression: y = mx + c
            x = np.arange(len(y))
            A = np.vstack([x, np.ones(len(x))]).T
            m, c = np.linalg.lstsq(A, y, rcond=None)[0]
            
            current_val = y[-1]
            
            result = {
                "trend": "stable", 
                "time_to_warn": None, 
                "time_to_crit": None,
                "probabilities": {"safe": 0, "warn": 0, "crit": 0}
            }
            
            # FORCE OVERRIDE: If current value is already high, set time to 0
            if current_val >= 2.0:
                result["time_to_crit"] = 0
                result["time_to_warn"] = 0
                result["trend"] = "critical_active"
            elif current_val >= 1.5:
                result["time_to_warn"] = 0
                result["trend"] = "warning_active"

            # Calculate Probabilities (Mock or Real)
            # Since we only get "prob of class 1" from basic RF, let's use the thresholds as a proxy for "risk probability"
            # OR we can assume predict_with_ml sets probabilities. 
            # Ideally we'd store the last `predict_proba` result. 
            # Let's add that to `self` in predict_with_ml first.
            if hasattr(self, 'last_proba'):
                 # Use real probabilities if available
                 pass

            if m > 0.001:
                result["trend"] = "increasing"
                
                # Time to Warning (1.5V)
                if current_val >= 1.5:
                    result["time_to_warn"] = 0 # Already passed
                else:
                    samples_warn = (1.5 - current_val) / m
                    if 0 < samples_warn < 3000:
                         result["time_to_warn"] = round(samples_warn * 0.1, 1)
                
                # Time to Critical (2.0V)
                if current_val >= 2.0:
                    result["time_to_crit"] = 0 # Already Critical
                else:
                    samples_crit = (2.0 - current_val) / m
                    if 0 < samples_crit < 3000:
                        result["time_to_crit"] = round(samples_crit * 0.1, 1)
            
            # If stable/decreasing but high, acknowledge the risk state
            elif current_val >= 2.0:
                 result["trend"] = "critical_stable"
                 result["time_to_crit"] = 0
            elif current_val >= 1.5:
                 result["trend"] = "warning_stable"
                 result["time_to_warn"] = 0
                        
            return result
        except Exception as e:
            logger.error(f"❌ Trends Error: {e}")
            return None
    
    def predict_with_thresholds(self, mq2_voltage, mq135_voltage):
        """
        Fallback threshold-based prediction
        Used when ML model is not available
        """
        prediction = "SAFE"
        confidence = 1.0
        
        if mq2_voltage >= 2.0 or mq135_voltage >= 2.0:
            prediction = "CRITICAL"
            confidence = 0.95
        elif mq2_voltage >= 1.5 or mq135_voltage >= 1.5:
            prediction = "WARN"
            confidence = 0.85
        
        ai_command = f"AI_{prediction}"
        self.last_prediction = prediction
        self.last_confidence = confidence
        self.prediction_time = datetime.now()
        
        return prediction, confidence, ai_command
    
    def predict_risk(self, mq2, mq135):
        """
        Legacy method for backward compatibility
        Returns (risk_score: 0-100, status: Safe/Warning/Danger, ai_command)
        """
        prediction, confidence, ai_command = self.predict_with_ml(mq2, mq135)
        
        # Calculate Dynamic Risk Score based on Voltage
        # Use the maximum reading to determine the overall risk
        max_voltage = max(mq2, mq135)
        
        if max_voltage < 1.5:
             # SAFE Zone (0V - 1.5V) -> Map to 0% - 49%
             # Logic: (Current / MaxSafe) * MaxScore
             risk_score = (max_voltage / 1.5) * 49
             status = "Safe"
             # prediction, confidence, ai_command handled by predict_with_ml above
             # but we might want to override status if voltage is low
        
        elif 1.5 <= max_voltage < 2.0:
             # WARNING Zone (1.5V - 2.0V) -> Map to 50% - 89%
             # Logic: 50 + (ProgressInZone * ZoneRange)
             ratio = (max_voltage - 1.5) / 0.5
             risk_score = 50 + (ratio * 39)
             status = "Warning"
             prediction = "WARN" # Force override for consistency
             ai_command = "AI_WARN"

        else:
             # DANGER Zone (2.0V+) -> Map to 90% - 100%
             # Assume max observable useful variance is up to 3.0V for 100%
             if max_voltage >= 3.0:
                 risk_score = 100
             else:
                 ratio = (max_voltage - 2.0) / 1.0
                 risk_score = 90 + (ratio * 10)
             
             status = "Danger"
             prediction = "CRITICAL"
             ai_command = "AI_CRITICAL"

        # Ensure valid integers
        risk_score = int(min(max(risk_score, 0), 100))
            
        return risk_score, status, ai_command
    
    def get_model_status(self):
        """Return current model status for dashboard"""
        return {
            "model_loaded": self.model_loaded,
            "last_prediction": self.last_prediction,
            "confidence": self.last_confidence,
            "prediction_time": self.prediction_time,
            "model_accuracy": 97.15,
            "total_predictions": self.total_predictions,
            "feature_importance": {
                "mq135_max_window": 23.5,
                "mq135_mean_window": 18.9,
                "mq135_now": 15.7,
                "mq2_max_window": 14.3,
                "mq2_now": 14.1,
                "mq2_mean_window": 10.3,
                "mq135_delta": 1.8,
                "mq2_delta": 1.5
            }
        }

ml_service = MLService()
