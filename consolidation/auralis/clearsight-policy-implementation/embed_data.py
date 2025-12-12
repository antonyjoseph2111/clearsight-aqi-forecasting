import csv
import os

csv_path = 'combined_delhi_aqi_from_graphs1.csv'
html_path = 'station_analysis.html'

try:
    with open(csv_path, 'r', encoding='utf-8') as f:
        csv_content = f.read()
        # Escape backticks if any (unlikely in CSV but good practice)
        csv_content = csv_content.replace('`', '\\`')

    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # Create the JS code for embedded data
    # We replace the loadData function to use the embedded string
    
    new_js_logic = f"""
        const csvData = `{csv_content}`;

        function loadData() {{
            Papa.parse(csvData, {{
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: function(results) {{
                    processData(results.data);
                    document.getElementById('loading').style.display = 'none';
                }},
                error: function(err) {{
                    console.error('Error parsing embedded CSV:', err);
                    alert('Error loading data.');
                    document.getElementById('loading').style.display = 'none';
                }}
            }});
        }}
    """

    # We need to replace the existing loadData function in the HTML
    # The existing function looks like:
    # function loadData() {
    #     Papa.parse('combined_delhi_aqi_from_graphs1.csv', {
    #         download: true,
    #         ...
    #     });
    # }
    
    # We'll search for the block to replace.
    # To be safe, we can just replace the specific Papa.parse call logic or the whole function if we can identify it.
    # Let's replace the whole `loadData` function definition.
    
    # Simple string replacement might be fragile if indentation varies, but let's try to match the start.
    start_marker = "function loadData() {"
    end_marker = "error: function(err) {"
    
    # Actually, simpler approach:
    # We know the specific file content I wrote.
    # I will construct the replace target carefully.
    
    target_code = """function loadData() {
            Papa.parse('combined_delhi_aqi_from_graphs1.csv', {
                download: true,
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: function (results) {
                    processData(results.data);
                    document.getElementById('loading').style.display = 'none';
                },
                error: function (err) {
                    console.error('Error loading CSV:', err);
                    alert('Error loading data. Please ensure the CSV file is present.');
                    document.getElementById('loading').style.display = 'none';
                }
            });
        }"""
        
    if target_code in html_content:
        new_html = html_content.replace(target_code, new_js_logic)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print("Successfully embedded CSV data into HTML.")
    else:
        print("Could not find the target code block to replace. Check indentation or content.")
        # Fallback: Print the first 100 chars of matching attempt
        print("Target start:", target_code[:50])

except Exception as e:
    print(f"Error: {e}")
