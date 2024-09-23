# Contributing to SideQuests

## Development Setup

### Local Env

It is recommended to run the app locally for development. Please follow these steps to get setup:

1. Clone the repository and navigate to the directory.

  ```sh
  git clone https://github.com/need4swede/SideQuests.git
  cd SideQuests
  ```

2. Create a python virtual environment

  ```sh
  $ python -m venv .venv
  $ source .venv/Scripts/activate
  (.venv) $
  ```

3. Install dependencies

  ```sh
  (.venv) $ pip install -r requirements.txt
  Collecting....
  ...
  ```

4. Start the app

  ```sh
  (.venv) $ ADMIN_USERNAME=admin ADMIN_PASSWORD=password python app.py
   * Serving Flask app 'app'
   * Debug mode: on
   WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
   * Running on all addresses (0.0.0.0)
   * Running on http://127.0.0.1:8080
   Press CTRL+C to quit
  ```

5. Open your browser to `http://localhost:8080` and login with user `admin` and password `password`

### Testing

TBD