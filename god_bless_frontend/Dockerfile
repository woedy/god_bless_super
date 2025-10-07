# Use the official Node.js image.
FROM node:18-alpine

# Set the working directory.
WORKDIR /app

# Copy package.json and package-lock.json (if available).
COPY package*.json ./

# Install dependencies.
RUN npm ci

# Copy the rest of the application files.
COPY . .

# Expose the port the app runs on.
EXPOSE 5173

# Command to run the app.
CMD ["npm", "run", "dev"]
