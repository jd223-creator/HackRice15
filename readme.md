# Finance Connect

A map-based currency tool designed to help Houston's diverse international community navigate global finances.

- **Hackathon**: HackRice 15
- **Track Submission**: Finance & Entrepreneurship
- **Challenge Submission**: Best Financial Hack (Capital One)


## Inspiration

As freshmen at Rice, we were inspired by the incredible diversity of Houston. We saw friends from all over the world struggle with navigating global finances, from sending money home to understanding a budget in a new country. Our goal was to build a simple, reliable tool to help—something that truly felt like it was made for Houston's international community.

## Technical

- Front-End: Built with React to create a dynamic user interface. We integrated the Mapbox API to power the live map and location search.

- Back-End: A Python API handles all the data processing, including fetching live currency rates from the Frankfurt API and serving the location data to the front-end.
  
## What It Does

Finance Connect is a user-friendly web application with a live, interactive map of Houston. You can enter a local ZIP code, and the map instantly flies to that area, displaying nearby money transfer services. A sidebar provides a real-time currency converter, powered by live exchange rates, so you always know exactly how much you're sending or spending.

## How We Built It

As beginners, this was our first time connecting a front-end to a back-end!

- **Front-End**: The part you see and click on is built with React. We used the Mapbox API to bring the map to life.
- **Back-End**: The brain of the operation is a Python API that handles all the serious stuff like user profiles and the currency rate calculations.

## Challenges We Ran Into

Our biggest challenge was connecting the front-end and back-end for the first time. We spent hours troubleshooting communication errors. Honestly, getting the map to load with its API token felt like a huge win for our team or even loading the currency rates.

## 🚀 Getting Started

To run this project on your own machine, follow these steps:

### 1. Prerequisites

Make sure you have Node.js and Python installed.

### 2. Set up the Front-End

```bash
# Go into the frontend folder
cd frontend

# Install all the needed packages
npm install

# IMPORTANT: Create a .env.local file in this folder
# and add your Mapbox API token like this:
# VITE_MAPBOX_ACCESS_TOKEN='your_token_here'
```

### 3. Set up the Back-End

```bash
# Go into the backend folder
cd backend

# Install the required Python libraries
pip install -r requirements.txt
```

### 4. Run the App

You'll need two terminals open.

**Terminal 1 (for the Back-End):**
```bash
# from the /backend folder
uvicorn main:app --reload
```

**Terminal 2 (for the Front-End):**
```bash
# from the /frontend folder
npm install
npm run dev
```

Your app will be running at `http://localhost:5173`.

## What's Next for Finance Connect

Our immediate next step is to fully integrate the Google Gemini AI to translate the entire app. This would make it truly accessible for everyone in Houston, no matter what language they speak.
