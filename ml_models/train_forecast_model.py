# ml_models/train_forecast_model.py

import pandas as pd
import mysql.connector
from mysql.connector import Error
from sklearn.linear_model import LinearRegression # A simple model for demonstration
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import pickle # To save the trained model

import sys
import os

# Add the backend directory to the Python path to import config
# This must happen BEFORE importing config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from config import DATABASE_CONFIG # Import database configuration from backend


# Function to establish database connection
def get_db_connection():
    try:
        conn = mysql.connector.connect(**DATABASE_CONFIG)
        if conn.is_connected():
            print("Successfully connected to MySQL database from ML script")
            return conn
    except Error as e:
        print(f"Error connecting to MySQL database from ML script: {e}")
        return None

def fetch_sales_data():
    conn = None
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)
            # Fetch transaction date and total amount for sales forecasting
            # We'll aggregate by day for simplicity
            query = """
            SELECT
                DATE(transaction_date) AS sale_date,
                SUM(total_amount) AS daily_revenue
            FROM Sales
            GROUP BY DATE(transaction_date)
            ORDER BY sale_date;
            """
            cursor.execute(query)
            sales_data = cursor.fetchall()
            return sales_data
    except Error as e:
        print(f"Error fetching sales data for ML: {e}")
        return []
    finally:
        if conn:
            conn.close()

def train_sales_forecast_model():
    sales_data = fetch_sales_data()
    if not sales_data:
        print("No sales data available to train the model.")
        return

    # Convert to Pandas DataFrame
    df = pd.DataFrame(sales_data)
    df['sale_date'] = pd.to_datetime(df['sale_date'])
    df.set_index('sale_date', inplace=True)

    # For a simple linear regression, we'll use a numerical representation of time
    # e.g., days since the first sale
    df['days_since_start'] = (df.index - df.index.min()).days

    # Prepare features (X) and target (y)
    X = df[['days_since_start']]
    y = df['daily_revenue']

    # Split data into training and testing sets (optional for simple demo, but good practice)
    # Using a simple split for time series can be tricky, often better to use time-based split
    # For this demo, we'll just use all data for training
    # X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train a simple Linear Regression model
    model = LinearRegression()
    model.fit(X, y) # Using all data for simplicity in this initial forecast

    # Evaluate the model (optional for this initial setup)
    # predictions = model.predict(X_test)
    # mse = mean_squared_error(y_test, predictions)
    # print(f"Model Mean Squared Error: {mse}")

    # Save the trained model
    model_filename = 'sales_forecast_model.pkl'
    model_path = os.path.join(os.path.dirname(__file__), model_filename)
    with open(model_path, 'wb') as file:
        pickle.dump(model, file)
    print(f"Sales forecasting model trained and saved to {model_path}")

    # Also save the minimum date, which is crucial for future predictions
    min_date_filename = 'min_sale_date.pkl'
    min_date_path = os.path.join(os.path.dirname(__file__), min_date_filename)
    with open(min_date_path, 'wb') as file:
        pickle.dump(df.index.min(), file)
    print(f"Minimum sale date saved to {min_date_path}")

if __name__ == '__main__':
    train_sales_forecast_model()
