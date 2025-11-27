# Base Image
FROM python:3.11-slim

# Environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV MECAB_NEOLOGD_PATH=/usr/lib/x86_64-linux-gnu/mecab/dic/mecab-ipadic-neologd

# Install system dependencies
RUN apt-get update && apt-get install -y \
    mecab \
    libmecab-dev \
    mecab-ipadic-utf8 \
    git \
    make \
    curl \
    xz-utils \
    sudo \
    wget \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# Install mecab-ipadic-neologd
RUN git clone --depth 1 https://github.com/neologd/mecab-ipadic-neologd.git /tmp/mecab-ipadic-neologd \
    && cd /tmp/mecab-ipadic-neologd \
    && ./bin/install-mecab-ipadic-neologd -n -y \
    && rm -rf /tmp/mecab-ipadic-neologd

# Install Pandoc (latest version)
RUN wget https://github.com/jgm/pandoc/releases/download/3.1.11/pandoc-3.1.11-1-amd64.deb \
    && dpkg -i pandoc-3.1.11-1-amd64.deb \
    && rm pandoc-3.1.11-1-amd64.deb

# Install Typst
RUN curl -L https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz | tar xJf - \
    && mv typst-x86_64-unknown-linux-musl/typst /usr/bin/typst \
    && chmod +x /usr/bin/typst \
    && rm -rf typst-x86_64-unknown-linux-musl

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
