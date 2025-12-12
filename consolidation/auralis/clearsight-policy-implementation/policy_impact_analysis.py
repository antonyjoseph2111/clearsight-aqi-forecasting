import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Set style for better-looking plots
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

# Load the data
df = pd.read_csv('combined_delhi_aqi_from_graphs1.csv')

# Convert Date to datetime
df['Date_parsed'] = pd.to_datetime(df['Year'].astype(str) + '-' + df['Month'], format='%Y-%b')

# Key policy milestones
policy_milestones = {
    '2020-04': 'BS-VI Implementation',
    '2020-10': 'CAQM Established',
    '2021-01': 'GRAP Enhanced',
    '2022-01': 'Stricter Vehicle Norms',
    '2023-01': 'Enhanced Dust Control',
    '2024-01': 'Clean Mobility Push',
    '2025-01': 'Zero-Tolerance Burning'
}

# Calculate yearly averages for each pollutant
yearly_avg = df.groupby(['Year', 'Gas'])['Concentration_Value'].mean().reset_index()

# Calculate percentage change from 2020 baseline
baseline_2020 = yearly_avg[yearly_avg['Year'] == 2020].set_index('Gas')['Concentration_Value']
yearly_avg['Baseline_2020'] = yearly_avg['Gas'].map(baseline_2020)
yearly_avg['Percent_Change'] = ((yearly_avg['Concentration_Value'] - yearly_avg['Baseline_2020']) / yearly_avg['Baseline_2020']) * 100

# Create comprehensive visualization
fig = plt.figure(figsize=(20, 12))
gs = fig.add_gridspec(3, 3, hspace=0.3, wspace=0.3)

# 1. Overall Trend for Major Pollutants (Large plot)
ax1 = fig.add_subplot(gs[0, :])
major_pollutants = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO']
for gas in major_pollutants:
    gas_data = yearly_avg[yearly_avg['Gas'] == gas]
    if not gas_data.empty:
        ax1.plot(gas_data['Year'], gas_data['Concentration_Value'], 
                marker='o', linewidth=2.5, markersize=8, label=gas)

ax1.set_xlabel('Year', fontsize=12, fontweight='bold')
ax1.set_ylabel('Average Concentration', fontsize=12, fontweight='bold')
ax1.set_title('Impact of Government Policies on Air Quality (2020-2025)\nDelhI-NCR Major Pollutants Trend', 
              fontsize=14, fontweight='bold', pad=20)
ax1.legend(loc='best', fontsize=10)
ax1.grid(True, alpha=0.3)
ax1.set_xticks(range(2020, 2026))

# 2. Percentage Change from 2020 Baseline
ax2 = fig.add_subplot(gs[1, 0])
for gas in major_pollutants:
    gas_data = yearly_avg[yearly_avg['Gas'] == gas]
    if not gas_data.empty:
        ax2.plot(gas_data['Year'], gas_data['Percent_Change'], 
                marker='s', linewidth=2, markersize=6, label=gas)

ax2.axhline(y=0, color='red', linestyle='--', linewidth=1.5, alpha=0.7, label='2020 Baseline')
ax2.set_xlabel('Year', fontsize=10, fontweight='bold')
ax2.set_ylabel('% Change from 2020', fontsize=10, fontweight='bold')
ax2.set_title('Percentage Change from 2020 Baseline', fontsize=11, fontweight='bold')
ax2.legend(loc='best', fontsize=8)
ax2.grid(True, alpha=0.3)
ax2.set_xticks(range(2020, 2026))

# 3. PM2.5 Detailed Analysis (Most critical pollutant)
ax3 = fig.add_subplot(gs[1, 1])
pm25_monthly = df[df['Gas'] == 'PM2.5'].groupby('Date_parsed')['Concentration_Value'].mean().reset_index()
pm25_monthly = pm25_monthly.sort_values('Date_parsed')
ax3.plot(pm25_monthly['Date_parsed'], pm25_monthly['Concentration_Value'], 
         color='darkred', linewidth=2, alpha=0.7)
ax3.fill_between(pm25_monthly['Date_parsed'], pm25_monthly['Concentration_Value'], 
                  alpha=0.3, color='red')

# Add policy milestone markers
for date_str, policy in policy_milestones.items():
    date = pd.to_datetime(date_str)
    if date >= pm25_monthly['Date_parsed'].min() and date <= pm25_monthly['Date_parsed'].max():
        ax3.axvline(x=date, color='green', linestyle='--', alpha=0.5, linewidth=1)

ax3.set_xlabel('Date', fontsize=10, fontweight='bold')
ax3.set_ylabel('PM2.5 Concentration', fontsize=10, fontweight='bold')
ax3.set_title('PM2.5 Trend with Policy Milestones', fontsize=11, fontweight='bold')
ax3.grid(True, alpha=0.3)
plt.setp(ax3.xaxis.get_majorticklabels(), rotation=45, ha='right')

# 4. Year-over-Year Improvement
ax4 = fig.add_subplot(gs[1, 2])
years = sorted(yearly_avg['Year'].unique())
improvements = {}
for gas in major_pollutants:
    gas_data = yearly_avg[yearly_avg['Gas'] == gas].sort_values('Year')
    if len(gas_data) >= 2:
        first_year = gas_data.iloc[0]['Concentration_Value']
        last_year = gas_data.iloc[-1]['Concentration_Value']
        improvements[gas] = ((last_year - first_year) / first_year) * 100

if improvements:
    gases = list(improvements.keys())
    values = list(improvements.values())
    colors = ['green' if v < 0 else 'red' for v in values]
    ax4.barh(gases, values, color=colors, alpha=0.7)
    ax4.axvline(x=0, color='black', linewidth=1)
    ax4.set_xlabel('% Change (2020 to 2025)', fontsize=10, fontweight='bold')
    ax4.set_title('Overall Policy Impact\n(Negative = Improvement)', fontsize=11, fontweight='bold')
    ax4.grid(True, alpha=0.3, axis='x')

# 5. Seasonal Pattern Analysis
ax5 = fig.add_subplot(gs[2, 0])
df['Month_num'] = pd.to_datetime(df['Month'], format='%b').dt.month
seasonal_pm25 = df[df['Gas'] == 'PM2.5'].groupby(['Year', 'Month_num'])['Concentration_Value'].mean().reset_index()
for year in sorted(df['Year'].unique()):
    year_data = seasonal_pm25[seasonal_pm25['Year'] == year].sort_values('Month_num')
    ax5.plot(year_data['Month_num'], year_data['Concentration_Value'], 
            marker='o', label=str(year), linewidth=2, alpha=0.7)

ax5.set_xlabel('Month', fontsize=10, fontweight='bold')
ax5.set_ylabel('PM2.5 Concentration', fontsize=10, fontweight='bold')
ax5.set_title('Seasonal PM2.5 Patterns by Year', fontsize=11, fontweight='bold')
ax5.legend(loc='best', fontsize=8)
ax5.set_xticks(range(1, 13))
ax5.set_xticklabels(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], rotation=45)
ax5.grid(True, alpha=0.3)

# 6. Policy Effectiveness Score
ax6 = fig.add_subplot(gs[2, 1])
# Calculate effectiveness based on reduction in pollutants
effectiveness_data = []
for year in range(2021, 2026):
    year_data = yearly_avg[yearly_avg['Year'] == year]
    prev_year_data = yearly_avg[yearly_avg['Year'] == year-1]
    
    reductions = []
    for gas in major_pollutants:
        current = year_data[year_data['Gas'] == gas]['Concentration_Value'].values
        previous = prev_year_data[prev_year_data['Gas'] == gas]['Concentration_Value'].values
        if len(current) > 0 and len(previous) > 0:
            reduction = ((previous[0] - current[0]) / previous[0]) * 100
            reductions.append(max(0, reduction))  # Only count improvements
    
    if reductions:
        effectiveness_data.append({'Year': year, 'Score': np.mean(reductions)})

if effectiveness_data:
    eff_df = pd.DataFrame(effectiveness_data)
    bars = ax6.bar(eff_df['Year'], eff_df['Score'], color='steelblue', alpha=0.7, edgecolor='black')
    ax6.set_xlabel('Year', fontsize=10, fontweight='bold')
    ax6.set_ylabel('Effectiveness Score (%)', fontsize=10, fontweight='bold')
    ax6.set_title('Policy Effectiveness Score\n(Avg. Pollutant Reduction)', fontsize=11, fontweight='bold')
    ax6.grid(True, alpha=0.3, axis='y')
    ax6.set_xticks(range(2021, 2026))

# 7. Station-wise Analysis
ax7 = fig.add_subplot(gs[2, 2])
station_avg = df[df['Gas'] == 'PM2.5'].groupby(['Year', 'Station'])['Concentration_Value'].mean().reset_index()
top_stations = df['Station'].value_counts().head(5).index
for station in top_stations:
    station_data = station_avg[station_avg['Station'] == station].sort_values('Year')
    if len(station_data) > 1:
        ax7.plot(station_data['Year'], station_data['Concentration_Value'], 
                marker='o', label=station.split('-')[0][:15], linewidth=1.5, alpha=0.7)

ax7.set_xlabel('Year', fontsize=10, fontweight='bold')
ax7.set_ylabel('PM2.5 Concentration', fontsize=10, fontweight='bold')
ax7.set_title('PM2.5 Trends by Station', fontsize=11, fontweight='bold')
ax7.legend(loc='best', fontsize=7)
ax7.grid(True, alpha=0.3)
ax7.set_xticks(range(2020, 2026))

# Add overall title and policy information
fig.suptitle('Government Policy Impact Analysis: Delhi-NCR Air Quality (2020-2025)\n' + 
             'Key Policies: BS-VI Norms | CAQM Establishment | GRAP Framework | Vehicle Restrictions | Stubble Burning Control',
             fontsize=16, fontweight='bold', y=0.995)

plt.savefig('policy_impact_analysis.png', dpi=300, bbox_inches='tight')
print("[SUCCESS] Comprehensive analysis saved as 'policy_impact_analysis.png'")

# Generate detailed statistics report
print("\n" + "="*80)
print("POLICY IMPACT ANALYSIS REPORT (2020-2025)")
print("="*80)

for gas in major_pollutants:
    gas_data = yearly_avg[yearly_avg['Gas'] == gas].sort_values('Year')
    if len(gas_data) >= 2:
        print(f"\n{gas}:")
        print(f"  2020 Average: {gas_data.iloc[0]['Concentration_Value']:.2f}")
        print(f"  2025 Average: {gas_data.iloc[-1]['Concentration_Value']:.2f}")
        change = gas_data.iloc[-1]['Percent_Change']
        print(f"  Overall Change: {change:+.2f}%")
        if change < 0:
            print(f"  [+] IMPROVEMENT: Reduced by {abs(change):.2f}%")
        else:
            print(f"  [-] DETERIORATION: Increased by {change:.2f}%")

print("\n" + "="*80)
print("POLICY MILESTONES:")
print("="*80)
for date, policy in policy_milestones.items():
    print(f"  {date}: {policy}")

print("\n" + "="*80)
print("Analysis complete! Check 'policy_impact_analysis.png' for visualizations.")
print("="*80)
