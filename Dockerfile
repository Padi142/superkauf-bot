# Use an official Node.js runtime as a base image
FROM node:21-alpine3.18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the local code to the container
COPY . .

# Expose the port your bot will run on
EXPOSE 3000

# Command to run your bot
CMD ["node", "index.js"]
