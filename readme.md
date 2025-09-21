# Finance Connect

A map-based currency tool designed to help Houston's diverse international community navigate global finances. Built by a team of freshmen for HackRice 15.

## Inspiration

As freshmen at Rice, we're constantly amazed by how diverse Houston is. We were inspired by our friends from all over the world who often face the challenge of navigating complex global finances. Sending money home or just understanding a budget in a new country can be stressful. We wanted to build a simple tool to help—something that felt like it was made for Houston's international community.

## What It Does

Finance Connect is a web app with a live map of the city as the background. You can type in any Houston ZIP code, and the map instantly flies to that location. A simple sidebar menu slides out to give you a currency converter that uses live, up-to-the-minute exchange rates, so you know exactly how much you're sending or spending.

## How We Built It

As beginners, this was our first time connecting a front-end to a back-end!

- **Front-End**: The part you see and click on is built with React. We used the Mapbox API to bring the map to life.
- **Back-End**: The brain of the operation is a Python API that handles all the serious stuff like user profiles and the currency rate calculations.

## Challenges We Ran Into

Honestly, our biggest challenge was that none of us had ever connected the front-end to the back-end before! We spent hours figuring out why the two parts wouldn't talk to each other, finally learning about a browser security rule called CORS and how to fix it. Just getting the map to load by figuring out how to use an API token felt like a huge win.

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
npm run dev
```

Your app will be running at `http://localhost:5173`.

## What's Next for Finance Connect

Our immediate next step is to fully integrate the Google Gemini AI to translate the entire app. This would make it truly accessible for everyone in Houston, no matter what language they speak.
