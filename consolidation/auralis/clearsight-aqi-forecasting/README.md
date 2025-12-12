# ClearSight AQI Forecasting System 🌍📊

**ClearSight** is an advanced air quality forecasting system designed for the Delhi NCR region. It leverages a **Hybrid Physics-Aware Deep Learning Model** to generate 72-hour forecasts for PM2.5 levels, integrating historical data with real-time safety checks to ensure high accuracy and reliability.

## 🚀 Key Features

*   **Hybrid Physics-Aware Model**: Combines deep learning (BiLSTM) with domain-specific physics constraints.
*   **Real-Time Safety Layer**: Dynamically adjusts forecasts based on live data from the CPCB RSS feed to prevent hallucinations or large deviations.
*   **72-Hour Forecasting**: Provides detailed hourly predictions for the next 3 days.
*   **Sequential Baseline**: Uses day-ahead forecasts as baselines for subsequent days to ensure trajectory smoothness.
*   **Interactive Web Map**: Visualizes forecasts, health alerts, and station data on an interactive map.

## 🏗️ Architecture

The system operates on a dual-layer architecture:

1.  **Deep Learning Core (`DeepCaster`)**: 
    *   Trained on 5 years of historical data (2020-2025).
    *   Uses BiLSTM networks to capture temporal dependencies in air quality data.
    *   Predicts raw PM2.5 sequences based on weather and past pollution levels.

2.  **Safety & Hybrid Engine**:
    *   **Source of Truth**: Fetches real-time AQI from CPCB.
    *   **Adaptive Weighting**: Calculates a "trust score" for the model vs. real-time data. If the model diverges significantly from current reality, the system leans heavily on real-time observations for the immediate future.
    *   **Geo-Spatial Integration**: Maps predictions to specific station coordinates for visualization.

## 📁 Project Structure

```
├── AQI_Map_Website/          # Frontend Web Application
│   ├── index.html            # Main dashboard interface
│   ├── script.js             # Map logic & data fetching
│   └── firebase-init.js      # Firebase configuration
│
├── AQI_System/               # Backend Forecasting Engine
│   ├── merged_aqi_dataset.csv
│   ├── cpcb_safety_layer.json # Real-time cached data
│   ├── forecast_safety_hybrid.json # Final forecast output
│   ├── fetch_cpcb_safety.py  # RSS Feed Scraper
│   ├── run_pipeline.bat      # Main execution script
│   └── src_deep_model/       # Deep Learning Source Code
│       ├── 01_data_prep.py
│       └── 04_hybrid_inference.py
│
└── README.md                 # Project Documentation
```

## 🛠️ Setup & Usage

### Prerequisites
*   Python 3.8+
*   Node.js (for local web hosting, optional)
*   TensorFlow, Pandas, NumPy, Requests

### Running the Forecast
1.  **Install Dependencies**:
    ```bash
    pip install pandas numpy tensorflow requests joblib
    ```
2.  **Fetch Real-Time Data**:
    ```bash
    python AQI_System/fetch_cpcb_safety.py
    ```
3.  **Run Pipeline**:
    Execute the batch script to process data and generate forecasts:
    ```cmd
    AQI_System/run_pipeline.bat
    ```
4.  **View Results**:
    Open `AQI_Map_Website/index.html` in your browser to see the visualized forecasts.

## 🔒 Configuration
This project uses Firebase for hosting and analytics. To run your own instance, update `AQI_Map_Website/firebase-init.js` with your project credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    // ... other config
};
```

## 🤝 Contribution
Contributions are welcome! Please feel free to verify the `merged_aqi_dataset.csv` exclusion in `.gitignore` before submitting PRs to keep the repo light_weight.

## 📄 License
This project is licensed under the MIT License.
