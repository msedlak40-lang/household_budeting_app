#!/usr/bin/env python3
"""
Analyze vendor patterns from transaction data to generate normalization rules.
"""

import re
import csv
from collections import defaultdict
from typing import Dict, List, Tuple

def load_transactions(filepath: str) -> List[Dict]:
    """Load transactions from CSV file."""
    transactions = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            transactions.append(row)
    return transactions

def extract_vendor_patterns(vendors: List[str]) -> Dict[str, List[str]]:
    """Group vendors by normalized base name."""
    patterns = defaultdict(list)
    
    for vendor in vendors:
        # Try to extract base vendor name
        base = normalize_vendor_base(vendor)
        patterns[base].append(vendor)
    
    return patterns

def normalize_vendor_base(vendor: str) -> str:
    """Extract base vendor name by removing common patterns."""
    v = vendor.upper()
    
    # Remove common patterns
    # Store numbers: #1234, 00018408, #0020
    v = re.sub(r'\s*#?\d{4,8}$', '', v)
    v = re.sub(r'\s+#\d+', '', v)
    
    # Location codes
    v = re.sub(r'\s+[A-Z]\d{5}$', '', v)
    
    # SQ * prefix (Square payments)
    v = re.sub(r'^SQ \*', '', v)
    
    # Amazon marketplace codes
    v = re.sub(r'AMAZON MKTPL?\*[A-Z0-9]+', 'AMAZON', v)
    
    # TST* prefix
    v = re.sub(r'^TST\*', '', v)
    
    # SP * prefix
    v = re.sub(r'^SP ', '', v)
    
    # FSP* prefix
    v = re.sub(r'^FSP\*', '', v)
    
    # PAR* prefix
    v = re.sub(r'^PAR\*', '', v)
    
    # Location names in vendor
    v = re.sub(r'\s+OVERLAND PARK.*$', '', v)
    v = re.sub(r'\s+LEAWOOD.*$', '', v)
    v = re.sub(r'\s+PRAIRIE FIRE.*$', '', v)
    
    # POS suffix
    v = re.sub(r'\s+POS$', '', v)
    
    # Outside suffix
    v = re.sub(r'\s+OUTSIDE$', '', v)
    
    # Trim whitespace
    v = v.strip()
    
    return v

def find_groups(patterns: Dict[str, List[str]]) -> List[Tuple[str, List[str]]]:
    """Find vendor groups with multiple variations."""
    groups = []
    for base, variants in patterns.items():
        if len(variants) > 1:
            groups.append((base, sorted(variants)))
    
    return sorted(groups, key=lambda x: len(x[1]), reverse=True)

def analyze_vendor_data(filepath: str):
    """Main analysis function."""
    print("Loading transactions...")
    transactions = load_transactions(filepath)
    
    # Get unique vendors
    vendors = list(set([t['Description'] for t in transactions if t.get('Description')]))
    print(f"Total unique vendors: {len(vendors)}\n")
    
    print("Analyzing patterns...")
    patterns = extract_vendor_patterns(vendors)
    groups = find_groups(patterns)
    
    print(f"\nFound {len(groups)} vendors with multiple variations:\n")
    print("=" * 80)
    
    # Show top groups
    for i, (base, variants) in enumerate(groups[:30], 1):
        print(f"\n{i}. {base} ({len(variants)} variations):")
        for variant in variants[:10]:  # Show first 10
            print(f"   - {variant}")
        if len(variants) > 10:
            print(f"   ... and {len(variants) - 10} more")
    
    # Generate normalization mapping
    print("\n" + "=" * 80)
    print("\nSUGGESTED NORMALIZATION RULES:")
    print("=" * 80)
    
    # Most common merchants
    merchant_counts = defaultdict(int)
    for t in transactions:
        vendor = t.get('Description', '')
        base = normalize_vendor_base(vendor)
        merchant_counts[base] += 1
    
    top_merchants = sorted(merchant_counts.items(), key=lambda x: x[1], reverse=True)[:50]
    
    print("\nTop 50 merchants by transaction count:")
    for i, (merchant, count) in enumerate(top_merchants, 1):
        variants = patterns.get(merchant, [merchant])
        print(f"{i:2}. {merchant:40} ({count:3} transactions, {len(variants)} variations)")

if __name__ == '__main__':
    analyze_vendor_data('/mnt/user-data/uploads/2026-01-02_transaction_download.csv')
