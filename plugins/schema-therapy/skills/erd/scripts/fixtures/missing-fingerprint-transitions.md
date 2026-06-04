## Transition Tables

### order

| From | Event (exact 01 string) | To |
|------|-------------------------|----|
| ∅ | Order Placed | placed |
| placed | Order Paid | paid |
| placed | Order Expired | expired |

### ticket

| From | Event (exact 01 string) | To |
|------|-------------------------|----|
| ∅ | Ticket Reserved | reserved |
| reserved | Ticket Sold | sold |
| reserved | Ticket Released | released |
