import random
import string
from datetime import datetime, timedelta
import csv

def generate():
    gamer_tags = [
        "gigaChad", "Bravo", "Charlie", "BenDover", "Echo", "anygifter", "ToyotaCorolla2015", "Hotel",  "Storm", 
        "India", "Juliet", "Kilo", "Ligma", "Mike", "Sigmal", "yourmom", "Papa", "Sapphire", 
        "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "certifiedLoverBoy", "Whiskey", "Aurora", 
        "Xray", "Yankee", "Zulu", "Jeff", "Blaze", "BenAgain", "Dusk", "Ember", "Nova", "Echoing"
        "Frost", "Glow", "Haze", "YlongMa", "Jade", "JonXina", "Lunar", "Mystic", "Shadow", 
        "Nebula", "Orbit", "USA#1", "Quasar", "lfgf", "MaeNgai", "Twilight", "Stone", 
        "Umbra", "Vortex", "Wisp", "Xenon", "YOnder", "River", "Sky", "Flame", "CyberPhoenix",
        "Ovahere", "Comet", "t0xic", "Serenity", "Horizon", "hatewatcher", "NeonNinja", "Ash",
        "Luna", "Solar", "Nimbus", "Akira", "Summit", "Mirage", "toky0Difft", "Velvet", "Zephyr",
        "Eclipse", "Cinder", "biashater", "IlovePoutine", "Narr", "Pioneer", "Thorn", "Cosmos", 
        "Radiance", "Voyage", "Verdant", "Echoes", "Spectra", "Falcon", "Pulse", "BlazeStorm",
        "HawkTuah", "Eden", "VerduRe", "Glint", "Onyx", "Thaemine", "Halcyon", "Shard", 
        "Garnet", "myca", "Zenith", "Haven", "Flare", "Titan", "Pri$m", "ErrorCode404",
        "Velocity", "Chroma", "Meadow", "Torrent", "Summers", "ignoranceisbliss", "Thistle", "Monsoon",
        "Harbinger", "Auroras", "Comets", "Equinox", "Stratos", "null" "Lyric", "Nomad", "Emberlight",     
        "Tens", "AWOOOL", "NightHunter", "CrimsonFang", "GhostReaper", "DarkVortex",
        "SolarFlare", "VenomStrike", "ThunderB0lt", "MysticDragon", "SteelTitan", "Axis",
        "PhantomRider", "LunarEclipse", "InfernoBlade", "SIlverHawk", "OmegaStrike",
        "RogueAssassin", "EchoWraith", "MidasTouch", "RiotGame", "SkyGuardian", "AGS", "Bezos",
        "ChaosBringer", "FrostWarden", "SpectralKnight", "DoomBringer", "VoidWalker",
        "RadiantFury", "ChinaLover", "IronClad", "NightStalker", "CrimsonAvenger",
        "ShadowWraith", "BlazeFurry", "ThunderFist", "MysticRogue", "SteelShadow",
        "PhantomStriker", "LunarWolf", "InfernoWarden", "SilverFang", "OmegaReaper",
        "RoguePhoenix", "EchoStrike", "NovaBlade", "BloodWolf", "SkyReaper", "Obsidian",
        "ChaosWarden", "FrostDragon", "SpectralFang", "DomStriker", "VoidHunter",
        "VALORANT", "StormWolf", "OnlyFang", "NightBlade", "CrimsonWraith", "Eon"
    ]

    def generate_username(counter):
        # List of meaningful words
        # Randomly select a word from the list
        random_word = gamer_tags[counter]
        
        # Generate a random number with length 0-4
        random_number = random.randint(0, 9999)  # This will generate a number between 0 and 9999
        
        # Combine the word and number to create the random name
        random_name = f"{random_word}{random_number}"

        # Randomly decide whether to add a "." or "_" character
        random_choice = random.choice([1, 2, 3])
        separator = random.choice(["_", "", "", ""])  # Choose either "" or "_"

        if random_choice == 1:  # 50% chance to add a character
            random_name = f"{random_word}{random_number}{separator}"
        elif random_choice == 2:
            random_name = f"{random_word}{random_number}"
        elif random_choice == 3:
            random_name = f"{random_word}{separator}"
        return random_name

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
        while True:
            # Generate random RGB components
            red = random.randint(0, 255)
            green = random.randint(0, 255)
            blue = random.randint(0, 255)
            
            # Ensure that at least one of the components is above a certain threshold (e.g., 128)
            if (red + blue + green) > 400:
                # Convert RGB to hex
                hex_color = f"#{red:02X}{green:02X}{blue:02X}"
                # Ensure the color is not #18181B
                return hex_color

    # Function to generate a random user object
    def generate_active_user(counter):
        username = generate_username(counter)
        date1 = generate_follow_date()
        date2 = generate_create_date()
        create_date = min(date1, date2)
        follow_date = max(date1, date2)

        # subAge in months: 0 is 70%, 1-12 is 28.5, 13-30 is 1%, and 31-69 is 0.5%
        subAge = [0, *range(1, 13), *range(13, 31), *range(31, 70)]
        chance = [70] + [28.5] * 12 + [1] * 18 + [0.5] * 39  # Corresponding weights

        return {
            "username": username,
            "createDate": create_date.strftime("%b %d %Y"),
            "followDate": follow_date.strftime("%b %d %Y"),
            "isSubbed": random.choices([0,1], [90, 10], k=1)[0],
            "subAge": random.choices(subAge, chance, k=1)[0],
            "subTier": random.choices([1,2,3],[97,2,1], k=1)[0],
            "prime": random.choices([0,1], [95, 5], k=1)[0],
            "mod": random.choices([0,1], [99, 1], k=1)[0],
            "turbo": random.choices([0,1], [95, 5], k=1)[0],
            "founder": random.choices([0,1], [99, 1], k=1)[0],
            "vip": random.choices([0,1], [99, 1], k=1)[0],
            "verified": random.choices([0,1], [99, 1], k=1)[0],
            "gifted": random.choices([0, *range(1,101)], [95] + [5]*100),
            "usernameColor": generate_hex_color()
        }

    # Filepath for the output CSV file
    output_file = "active_viewers.csv"

    # Generate random users
    # random_users = [generate_active_user() for _ in range(100)]

    active_users = []

    for i in range(len(gamer_tags)):
        active_users.append(generate_active_user(i))

    # Write the users to a CSV file
    with open(output_file, mode="w", newline="") as file:
        writer = csv.writer(file)
        # Write the header
        # writer.writerow(["username", "followDate", "usernameColor"])
        # Write user data
        for user in active_users:
            writer.writerow([user["username"],user["createDate"] , user["followDate"], user["isSubbed"], user["subAge"], user["subTier"], 
                             user["prime"], user["mod"], user["turbo"], user["founder"], user["vip"], user["verified"], user['gifted'], user["usernameColor"]])

    print(f"Data has been written to {output_file}")

#generate()
