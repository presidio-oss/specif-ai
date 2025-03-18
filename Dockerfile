# Dockerfile for building a multi-stage application image
# This image includes both the front-end (Angular) and back-end (Python) components.
# The image is designed to be lightweight for production deployment.
# The build process is split into multiple stages to optimize the final image size.

# Maintainer: [ Karthick/Cloud&DevOps Team], [kelumalai@presidio.com]
# Please reach out for support or issues with this Dockerfile.
# Last Updated: [25th Feb 2025]

# Stage 1:  Runtime Backend and Frontend in the nginx
# This stage is used to combine the results from the previous two stages (frontend and backend)


##############################################################################################
# Stage 1: Set up the runtime environment for NGINX to serve both Angular and Python backend #
##############################################################################################

FROM nginx:alpine as runtime

# Install necessary dependencies for Python (to run the backend) and Git
RUN apk --no-cache update && \
    apk --no-cache add \
        python3 \
        py3-pip \
        curl \
        bash \
        openssl \
        gcc \
        musl-dev \
        libffi-dev \
        git \
        jq

# # Install AWS CLI using pip
# RUN pip3 install --no-cache-dir awscli

# Install AWS CLI using apk
RUN apk --no-cache add aws-cli

# Remove default NGINX content
RUN rm -rf /usr/share/nginx/html/*

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf

##############################################################################################
# Backend Configuration                                                                      #
##############################################################################################

WORKDIR /usr/src/app
COPY backend .

# Create a Python virtual environment and install dependencies
RUN python3 -m venv venv
# Install dependencies from requirements.txt (if not already installed)
RUN . venv/bin/activate && pip install --no-cache-dir -r requirements.txt

# Set the environment variable for GitPython to avoid the import error
ENV GIT_PYTHON_REFRESH=quiet

# Expose the ports
EXPOSE 80

##############################################################################################
# Start both the backend and NGINX                                                           #
##############################################################################################
CMD [ "sh", "-c", ". /usr/src/app/venv/bin/activate && python /usr/src/app/init.py & nginx -g 'daemon off;'" ]

# The container will start the backend and NGINX when run, serving both the frontend
# and backend as a unified application.
# C    oordinate updates with DevOps teams for sensitive environment variables.