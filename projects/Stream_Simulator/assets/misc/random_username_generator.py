import random
import string
from datetime import datetime, timedelta
import csv

def generate():

    # Function to generate a random username
    def generate_username():
        length = random.randint(6, 12)  # Username length between 6 and 12
        characters = string.ascii_letters + string.digits
        return ''.join(random.choice(characters) for _ in range(length))

    # Function to generate a random follow date
    def generate_follow_date():
        start_date = datetime(2000, 1, 1)  # Start date: Jan 1, 2000
        end_date = datetime(2025, 12, 31)  # End date: Dec 31, 2025
        random_date = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))
        return random_date.strftime("%b %d %Y")

    # Function to generate a random HEX color code
    def generate_hex_color():
        return f"#{''.join(random.choice('0123456789ABCDEF') for _ in range(6))}"

    # Function to generate a random user object
    def generate_random_user():
        return {
            "username": generate_username(),
            "followDate": generate_follow_date(),
            "usernameColor": generate_hex_color()
        }

    # Filepath for the output CSV file
    output_file = "random_users.csv"

    # Generate random users
    random_users = [generate_random_user() for _ in range(100)]

    # Write the users to a CSV file
    with open(output_file, mode="w", newline="") as file:
        writer = csv.writer(file)
        # Write the header
        # writer.writerow(["username", "followDate", "usernameColor"])
        # Write user data
        for user in random_users:
            writer.writerow([user["username"], user["followDate"], user["usernameColor"]])

    print(f"Data has been written to {output_file}")

# generate()
