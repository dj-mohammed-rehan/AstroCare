# AstroCare 🚀
### AI-Powered Astronaut Health Monitoring System

AstroCare is a space-health monitoring platform designed to support astronaut well-being during space missions. It aims to transform physiological data into meaningful health insights, helping mission teams monitor vital signs, identify unusual patterns, and make informed decisions in environments where immediate medical assistance may be limited.

## Overview

Space missions expose astronauts to unique physiological challenges, including microgravity, isolation, stress, and changes in cardiovascular and respiratory activity. AstroCare aims to provide a centralized monitoring interface for tracking health signals and identifying potential anomalies.

## Key Features

- **Health Monitoring Dashboard** – Centralized visualization of astronaut health information.
- **Vital Signal Analysis** – Monitoring physiological signals such as pulse and respiratory activity.
- **AI-Assisted Anomaly Detection** – Identifying unusual patterns in physiological data to support early awareness.
- **Signal Visualization** – Visual representation of health signals for easier interpretation.
- **Health Status Overview** – Organized presentation of monitoring information and alerts.
- **Responsive Interface** – Designed for accessibility across different screen sizes.
- **Data-Driven Analysis** – Built with physiological datasets to support analysis and experimentation.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask |
| Data Processing | Python |
| Dataset | BIDMC PPG and Respiration Dataset |
| AI / ML | Data-driven physiological signal analysis |

## Dataset

AstroCare uses the **BIDMC PPG and Respiration Dataset** as a research resource for physiological signal analysis.

The dataset contains physiological recordings that can support experimentation with pulse-related and respiratory signal monitoring.

Dataset source:  
[PhysioNet - BIDMC PPG and Respiration Dataset](https://physionet.org/content/bidmc/1.0.0/)

Please refer to the dataset's documentation and license before using or redistributing its data.

## System Architecture

1. **Data Input** – Physiological recordings are loaded into the system.
2. **Processing Layer** – Python processes the data and extracts relevant information.
3. **Analysis Layer** – Signal analysis and anomaly-detection logic evaluate physiological patterns.
4. **Backend API** – Flask handles processing and serves information to the frontend.
5. **Dashboard** – The frontend presents health information and visualizations to the user.

## Project Structure

```text
AstroCare/
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── script.js
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── ...
│
├── dataset/
│   └── physiological-data/
│
└── README.md
```

*The structure above is illustrative and may differ from the actual repository.*

## Getting Started

### Prerequisites

- Python 3.10+
- pip
- A modern web browser

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/YOUR-USERNAME/AstroCare.git
cd AstroCare
```

**2. Create a virtual environment**

```bash
python -m venv venv
```

Activate it:

Windows:
```bash
venv\Scripts\activate
```

macOS / Linux:
```bash
source venv/bin/activate
```

**3. Install dependencies**

```bash
pip install -r backend/requirements.txt
```

**4. Start the backend**

```bash
python backend/app.py
```

**5. Open the application**

Open the frontend through your local setup or the URL provided by the Flask server.

> Adjust the commands above to match the actual paths and configuration in the repository.

## Vision

AstroCare aims to bridge physiological data analysis and space-health technology by making astronaut health information easier to monitor and interpret.

Our goal is to explore how intelligent monitoring systems could assist in maintaining astronaut safety, supporting early detection of unusual physiological patterns, and contributing to the future of human space exploration.

## Future Scope

- Integration with wearable and onboard medical sensors
- Live physiological data streaming
- Improved anomaly detection models
- Personalized astronaut health baselines
- Intelligent alert prioritization
- Historical health trends and mission reports
- Edge processing for reduced dependence on communication latency

## Disclaimer

AstroCare is a prototype developed for educational and hackathon purposes. It is not a certified medical device and is not intended to diagnose, treat, or replace professional medical judgment. Its outputs should not be used as the sole basis for medical or mission-critical decisions.

## Team & Contributions

Built as a hackathon project focused on astronaut health, space technology, and AI-assisted physiological monitoring.

Contributions, ideas, and feedback are welcome.

---

**AstroCare | Supporting astronaut health, one signal at a time.** 🚀

To view this website : https://comforting-horse-5b155e.netlify.app/


