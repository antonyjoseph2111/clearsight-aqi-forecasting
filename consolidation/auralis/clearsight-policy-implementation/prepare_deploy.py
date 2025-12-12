import os
import shutil

# Define source and destination
source_dir = os.getcwd()
public_dir = os.path.join(source_dir, 'public')

# Create public directory if it doesn't exist
if os.path.exists(public_dir):
    shutil.rmtree(public_dir)
os.makedirs(public_dir)

# Files to copy
# We need strictly web assets. 
# Note: station_analysis.html has embedded data, but other pages might rely on the CSV.
# We'll copy the CSV just in case dashboard.html is used.
files_to_copy = [
    'station_analysis.html',
    'dashboard.html',
    'policies.html',
    'dashboard_style.css',
    'policies_style.css',
    'dashboard_main.js',
    'dashboard_charts.js',
    'dashboard_data.js',
    'dashboard_interactions.js',
    'policies_script.js',
    'combined_delhi_aqi_from_graphs1.csv',
    'landing.html'
]

print(f"Preparing deployment in: {public_dir}")

for file_name in files_to_copy:
    src = os.path.join(source_dir, file_name)
    dst = os.path.join(public_dir, file_name)
    
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"Copied: {file_name}")
    else:
        print(f"Warning: {file_name} not found in source directory.")

# Create index.html pointing to landing.html
index_path = os.path.join(public_dir, 'index.html')
landing_path = os.path.join(public_dir, 'landing.html')

if os.path.exists(landing_path):
    shutil.copy2(landing_path, index_path)
    print("Created index.html from landing.html")

print("\nDeployment preparation complete.")
print("To deploy to Render:")
print("1. Push this code to GitHub")
print("2. Create a new Static Site on Render")
print("3. Connect your GitHub repository")
print("4. Set the Publish Directory to 'public' (if using this script) or root if deploying directly")
