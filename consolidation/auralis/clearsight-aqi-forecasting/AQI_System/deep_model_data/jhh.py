import numpy as np
import pandas as pd

# Load the .npz file
data = np.load('train_data.npz')  # Replace 'input.npz' with your actual .npz file path

# Print available arrays to debug
print("Available arrays in the .npz file:", data.files)

# Handle the extraction dynamically
if len(data.files) == 0:
    raise ValueError("The .npz file is empty. No arrays found.")
elif len(data.files) == 1:
    array_name = data.files[0]
    print(f"Using the only available array: '{array_name}'")
    array_data = data[array_name]
else:
    # For multiple arrays, we'll assume the first one; adjust index if needed
    array_name = data.files[0]
    print(f"Multiple arrays found. Using the first one: '{array_name}'")
    print("All arrays:", data.files)  # List them for reference
    array_data = data[array_name]

# Convert to pandas DataFrame (assumes 2D array for tabular data)
# If it's 1D, this will make a single-column DF; for higher dims, you may need reshaping
df = pd.DataFrame(array_data)

# Save to CSV
df.to_csv('output.csv', index=False)  # Replace 'output.csv' with your desired output path

# Close the data file
data.close()

print("Conversion complete: .npz file converted to CSV.")