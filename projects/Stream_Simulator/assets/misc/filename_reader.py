import os

def record_files_in_folder(folder_path, output_file="file_list.txt"):
    try:
        # Check if the specified folder exists
        if not os.path.exists(folder_path):
            print(f"The folder '{folder_path}' does not exist.")
            return
        
        # Open the output file for writing
        with open(output_file, "w") as f:
            # Iterate through the folder contents
            for file_name in os.listdir(folder_path):
                # Check if the item is a file
                if os.path.isfile(os.path.join(folder_path, file_name)):
                    # Write the file name and extension to the output file
                    f.write(file_name + "\n")
        
        print(f"File names and extensions have been recorded in '{output_file}'.")
    
    except Exception as e:
        print(f"An error occurred: {e}")


# Call the function
# record_files_in_folder('./7tv emote')
