/**
 * Test file for Prism.js syntax highlighting
 * 
 * This file contains various code examples to test the syntax highlighting
 * functionality in the chatbot interface.
 */

// JavaScript example
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// TypeScript example
interface User {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
}

const user: User = {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    isActive: true
};

// Python example
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

# Test the function
numbers = [3, 6, 8, 10, 1, 2, 1]
sorted_numbers = quick_sort(numbers)
print(f"Sorted: {sorted_numbers}")

// HTML example
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
</head>
<body>
    <h1>Hello World</h1>
    <p>This is a test paragraph.</p>
    <script src="app.js"></script>
</body>
</html>

// CSS example
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5;
}

.button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

// JSON example
{
    "name": "Test Project",
    "version": "1.0.0",
    "description": "A test project for syntax highlighting",
    "main": "index.js",
    "scripts": {
        "start": "node index.js",
        "dev": "nodemon index.js",
        "test": "jest"
    },
    "dependencies": {
        "express": "^4.17.1",
        "cors": "^2.8.5"
    },
    "devDependencies": {
        "nodemon": "^2.0.7",
        "jest": "^27.0.6"
    }
}

// SQL example
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.email
HAVING COUNT(p.id) > 0
ORDER BY post_count DESC
LIMIT 10;

// Bash example
#!/bin/bash

# Function to check if a service is running
check_service() {
    local service_name=$1
    if systemctl is-active --quiet $service_name; then
        echo "$service_name is running"
        return 0
    else
        echo "$service_name is not running"
        return 1
    fi
}

# Check multiple services
services=("nginx" "postgresql" "redis")
for service in "${services[@]}"; do
    check_service $service
done

# Create backup
backup_dir="/backups/$(date +%Y%m%d)"
mkdir -p $backup_dir
tar -czf "$backup_dir/database.tar.gz" /var/lib/postgresql/data/
