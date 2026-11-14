# RealPict - PHP 8.2 on Apache
FROM php:8.2-apache

# Install required PHP extensions
RUN apt-get update && apt-get install -y \
    libgd-dev \
    libjpeg-dev \
    libpng-dev \
    libwebp-dev \
    libfreetype6-dev \
    --no-install-recommends && \
    docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp && \
    docker-php-ext-install -j$(nproc) \
        gd \
        exif && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Set working directory
WORKDIR /var/www/html

# Copy project files
COPY . .

# Create upload directories with correct permissions
RUN mkdir -p uploads/temp_analyzed uploads/training && \
    chown -R www-data:www-data uploads && \
    chmod -R 775 uploads

# Make data directory writable (for config.json)
RUN chown -R www-data:www-data data && \
    chmod -R 664 data/config.json || true

# Remove scratch files from production
RUN rm -rf scratch node_modules

# Custom PHP config
RUN echo "upload_max_filesize = 20M" >> /usr/local/etc/php/conf.d/realpict.ini && \
    echo "post_max_size = 25M" >> /usr/local/etc/php/conf.d/realpict.ini && \
    echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/realpict.ini && \
    echo "max_execution_time = 60" >> /usr/local/etc/php/conf.d/realpict.ini

# Apache config: allow .htaccess overrides
RUN echo '<Directory /var/www/html>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/realpict.conf && \
    a2enconf realpict

EXPOSE 80

CMD ["apache2-foreground"]
