def get_distinct_prime_factors(n):
    factors = set()
    d = 2
    temp = n
    while d * d <= temp:
        if temp % d == 0:
            factors.add(d)
            while temp % d == 0:
                temp //= d
        d += 1
    if temp > 1:
        factors.add(temp)
    return factors

def is_prime(n):
    if n < 2: return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0: return False
    return True

results = []
for n in range(1, 10000):
    factors = get_distinct_prime_factors(n)
    if sum(factors) == n:
        if not is_prime(n):
            results.append(n)
        else:
            # We know primes work, but we're looking for others.
            pass

print("Composite solutions:", results)
