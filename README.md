# Recharge Basin Assessment App 🌊

This project helps California farmers and water managers estimate groundwater recharge potential, project costs, and ROI for converting farmland into recharge basins.

Built with:
- **React + Vite** for the front-end
- **TailwindCSS** for styling
- **Node.js + Express** for the backend
- **MongoDB Atlas** for data storage

## Project Overview

Groundwater levels in California’s Central Valley have dropped drastically due to decades of over-pumping and reduced surface water.  
This tool allows farmers to:
- Enter their land and cost details
- Calculate recharge volume and cost-benefit
- Review simple payback and ROI metrics

## Development Setup

To run the app locally:

```bash
# Start the frontend
npm run dev

# Start the backend (in /server)
cd server
npx nodemon server.js