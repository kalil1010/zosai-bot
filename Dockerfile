# Use Node.js LTS lightweight image
FROM node:18-alpine

# Set app directory
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install only production deps, fallback if no lock file
RUN npm ci --omit=dev || npm install --omit=dev

# Copy everything else
COPY . .

# Expose port (Railway sets PORT dynamically)
EXPOSE 8080

# Run our start script
CMD ["npm", "run", "start"]
