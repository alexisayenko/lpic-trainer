# dig — Study Notes

Source: "LKB-LPIC-2. dig" study document.

> Note: The source PDF for `dig` rendered as a single blank page (a loading
> placeholder only) and contained no extractable text. No quiz questions
> could be extracted. If a complete copy of the document becomes available,
> re-run the extraction.

## Reference (general dig knowledge)

`dig` (Domain Information Groper) is the standard DNS lookup utility from BIND.

Common usage:

```
dig example.com                 # default A-record query
dig example.com MX              # query a specific record type
dig @8.8.8.8 example.com        # query a specific server
dig -x 192.0.2.1                # reverse lookup (PTR)
dig example.com +short          # concise output
dig example.com +trace          # trace delegation from the root
dig example.com ANY             # request all record types
dig example.com AXFR            # request a full zone transfer
```

Output sections: QUESTION, ANSWER, AUTHORITY, ADDITIONAL.
