import sys, json
d = json.load(sys.stdin)
for x in sorted(d, key=lambda x: -(x["current_price"] or 0))[:8]:
    print(x["name"], x["current_price"], x["board_type"], x["is_sponsored"])
