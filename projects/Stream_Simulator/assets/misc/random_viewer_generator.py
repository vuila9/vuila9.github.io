import random
import string
from datetime import datetime, timedelta
import csv

def generate():
    unique_names = set()

    # Function to generate a random username
    def generate_username():
        length = random.randint(6, 12)  # Username length between 6 and 12
        characters = string.ascii_letters + string.digits
        return ''.join(random.choice(characters) for _ in range(length))

    # Function to generate a random follow date
    def generate_follow_date():
        start_date = datetime(2011, 6, 6)  # Start date: June 6, 2011
        end_date = datetime(2025, 12, 31)  # End date: Dec 31, 2025
        random_date = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))
        return random_date
    
    # Function to generate a random create date
    def generate_create_date():
        start_date = datetime(2019, 5, 14)  # Start date: May 14, 2019
        end_date = datetime(2025, 12, 31)  # End date: Dec 31, 2025
        random_date = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))
        return random_date

    # Function to generate a random HEX color code
    def generate_hex_color():
        random_hex_color = f"#{''.join(random.choice('0123456789ABCDEF') for _ in range(6))}"
        while (random_hex_color == f"#18181b"):
            random_hex_color = f"#{''.join(random.choice('0123456789ABCDEF') for _ in range(6))}"
        return random_hex_color

    # Function to generate a random user object
    def generate_random_user():
        username = generate_username()
        while (username in unique_names):
            username = generate_username()
        unique_names.add(username)
        date1 = generate_follow_date()
        date2 = generate_create_date()
        create_date = min(date1, date2)
        follow_date = max(date1, date2)

        # subAge in months: 0 is 90%, 1-12 is 9%, 13-30 is 0.9%, and 31-69 is 0.1%
        subAge = [0, *range(1, 13), *range(13, 31), *range(31, 70)]
        chance = [90] + [9] * 12 + [0.9] * 18 + [0.1] * 39  # Corresponding weights

        return {
            "username": username,
            "createDate": create_date.strftime("%b %d %Y"),
            "followDate": follow_date.strftime("%b %d %Y"),
            "isSubbed": random.choices([0,1], [90, 10], k=1)[0],
            "subAge": random.choices(subAge, chance, k=1)[0],
            "subTier": random.choices([1,2,3],[97,2,1], k=1)[0],
            "prime": random.choices([0,1], [90, 10], k=1)[0],
            "mod": random.choices([0,1], [99, 1], k=1)[0],
            "turbo": random.choices([0,1], [95, 5], k=1)[0],
            "founder": random.choices([0,1], [99, 1], k=1)[0],
            "vip": random.choices([0,1], [99, 1], k=1)[0],
            "verified": random.choices([0,1], [99, 1], k=1)[0],
            "usernameColor": generate_hex_color()
        }

    # Filepath for the output CSV file
    output_file = "random_viewers.csv"

    # Generate random users
    random_users = [generate_random_user() for _ in range(1000)]

    # Write the users to a CSV file
    with open(output_file, mode="w", newline="") as file:
        writer = csv.writer(file)
        # Write the header
        # writer.writerow(["username", "followDate", "usernameColor"])
        # Write user data
        for user in random_users:
            writer.writerow([user["username"],user["createDate"] , user["followDate"], user["isSubbed"], user["subAge"], user["subTier"], 
                             user["prime"], user["mod"], user["turbo"], user["founder"], user["vip"], user["verified"], user["usernameColor"]])

    print(f"Data has been written to {output_file}")

generate()
