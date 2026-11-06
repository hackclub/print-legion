FROM ruby:3.3-slim

WORKDIR /app

ENV RAILS_ENV=production \
    BUNDLE_WITHOUT=development:test \
    BUNDLE_DEPLOYMENT=1 \
    RAILS_SERVE_STATIC_FILES=1

# build-essential compiles puma's native extension.
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

# Fingerprints assets. No real secret is needed at build time.
RUN SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile

EXPOSE 3000

# SECRET_KEY_BASE and AIRTABLE_API_KEY (or AIRTABLE_KEY) must be provided at runtime.
CMD ["bin/rails", "server", "-b", "0.0.0.0", "-p", "3000"]
