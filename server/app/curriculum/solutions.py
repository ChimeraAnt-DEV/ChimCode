"""Known-correct solutions, one per lesson.

The worked example in each lesson deliberately teaches a broader idea than the
task demands, so it often does not itself satisfy the task's checks. Hints and
walkthroughs need a real solution, so it lives here and is applied by the
registry. Every entry is asserted against its lesson's checks in
tools/test_local_backend.js and the Python test.
"""
from __future__ import annotations

SOLUTIONS: dict[str, str] = {
    # ------------------------------------------------------------- Python
    "py-hello": 'print("Hello, ChimCode!")',
    "py-variables": "score = 100\nprint(type(score))",
    "py-strings": 'count = 700\nprint(f"ChimCode has {count} achievements")',
    "py-conditionals": 'score = 72\nif score >= 50:\n    print("pass")\nelse:\n    print("fail")',
    "py-loops": "for n in range(1, 6):\n    print(n)",
    "py-functions": "def square(n):\n    return n * n\n\nprint(square(4))",
    "py-collections": "squares = [n * n for n in range(1, 6)]\nprint(squares)",
    "py-errors": 'value = "abc"\ntry:\n    n = int(value)\nexcept ValueError:\n    print("invalid")',
    "py-files": "with open('log.txt', 'w') as f:\n    f.write('chimcode')",
    "py-classes": (
        "class Book:\n"
        "    def __init__(self, title):\n"
        "        self.title = title\n"
        "\n"
        "    def describe(self):\n"
        "        return self.title"
    ),
    "py-modules": "import json\n\nprint(json.dumps({'ok': True}))",
    "py-decorators": "def twice(fn):\n    def wrapper():\n        fn()\n        fn()\n    return wrapper",
    "py-async": "import asyncio\n\nasync def ping():\n    await asyncio.sleep(0.1)\n    return 'pong'",
    "py-bots": (
        "import discord\n\n"
        "bot = discord.Client(intents=discord.Intents.default())\n\n"
        "@bot.event\n"
        "async def on_message(message):\n"
        "    if message.author.bot:\n"
        "        return\n"
        "    if message.content == '!ping':\n"
        "        await message.channel.send('pong')"
    ),
    "py-scraping": (
        "import requests\nfrom bs4 import BeautifulSoup\n\n"
        "html = requests.get('https://example.com', timeout=10).text\n"
        "soup = BeautifulSoup(html, 'html.parser')\n"
        "print(soup.title.string)"
    ),
    "py-testing": "def square(n):\n    return n * n\n\ndef test_square():\n    assert square(3) == 9",
    "py-server": (
        "from fastapi import FastAPI\n\n"
        "app = FastAPI()\n\n"
        "@app.get('/health')\n"
        "def health():\n"
        "    return {'status': 'ok'}"
    ),
    # ---------------------------------------------------------------- C++
    "cpp-hello": '#include <iostream>\n\nint main() {\n    std::cout << "Hello, ChimCode!" << std::endl;\n    return 0;\n}',
    "cpp-variables": "#include <iostream>\n\nint main() {\n    int score = 100;\n    std::cout << score << std::endl;\n    return 0;\n}",
    "cpp-control": "#include <iostream>\n\nint main() {\n    for (int i = 1; i <= 5; ++i) {\n        std::cout << i << std::endl;\n    }\n    return 0;\n}",
    "cpp-functions": "#include <iostream>\n\nint square(int n) {\n    return n * n;\n}\n\nint main() {\n    std::cout << square(5) << std::endl;\n}",
    "cpp-pointers": "#include <iostream>\n\nint main() {\n    int value = 10;\n    int* p = &value;\n    *p = 20;\n    int* spare = nullptr;\n    return 0;\n}",
    "cpp-vectors": "#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> nums = {1, 2, 3};\n    nums.push_back(4);\n    for (int n : nums) {\n        std::cout << n << std::endl;\n    }\n}",
    "cpp-classes": "#include <iostream>\n#include <string>\n\nclass Book {\npublic:\n    Book(std::string t) : title(t) {}\n    std::string describe() { return title; }\n    std::string title;\n};",
    "cpp-memory": "#include <iostream>\n#include <memory>\n\nint main() {\n    std::unique_ptr<int> ptr = std::make_unique<int>(42);\n    std::cout << *ptr << std::endl;\n    return 0;\n}",
    "cpp-templates": "#include <iostream>\n\ntemplate <typename T>\nT maxOf(T a, T b) {\n    return (a > b) ? a : b;\n}",
    "cpp-socket-server": (
        "#include <sys/socket.h>\n#include <netinet/in.h>\n\n"
        "int server = socket(AF_INET, SOCK_STREAM, 0);\n"
        "sockaddr_in addr{};\n"
        "addr.sin_family = AF_INET;\n"
        "addr.sin_port = htons(8080);\n"
        "bind(server, (sockaddr*)&addr, sizeof(addr));\n"
        "listen(server, 5);"
    ),
    "cpp-optimisation": "#include <iostream>\n#include <vector>\n#include <utility>\n\nint main() {\n    std::vector<int> a = {1, 2, 3};\n    std::vector<int> b = std::move(a);\n    return 0;\n}",
    # --------------------------------------------------------- JavaScript
    "js-hello": 'const name = "ChimCode";\nconsole.log(name);',
    "js-functions": "const square = (n) => n * n;\nconsole.log(square(5));",
    "js-arrays": "const nums = [1, 2, 3, 4, 5, 6];\nconst evens = nums.filter((n) => n % 2 === 0);\nconsole.log(evens);",
    "js-async": "async function load() {\n  const res = await fetch('/api/status');\n  return res.json();\n}",
    "js-node-server": (
        "const http = require('http');\n\n"
        "http.createServer((req, res) => {\n"
        "  res.writeHead(200, { 'Content-Type': 'application/json' });\n"
        "  res.end(JSON.stringify({ status: 'ok' }));\n"
        "}).listen(3000);"
    ),
    # --------------------------------------------------------- TypeScript
    "ts-types": "interface User {\n  name: string;\n  age: number;\n}\n\nconst u: User = { name: 'Ada', age: 21 };",
    "ts-generics": "function first<T>(items: T[]): T | undefined {\n  return items[0];\n}",
    # --------------------------------------------------------------- Java
    "java-hello": 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, ChimCode!");\n    }\n}',
    "java-oop": 'class Animal {\n    String sound() { return "..."; }\n}\n\nclass Dog extends Animal {\n    @Override\n    String sound() { return "woof"; }\n}',
    "java-collections": "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> names = new ArrayList<>();\n        names.add(\"Ada\");\n        for (String n : names) {\n            System.out.println(n);\n        }\n    }\n}",
    "java-spring": "@RestController\nclass StatusController {\n    @GetMapping(\"/health\")\n    Map<String, String> health() {\n        return Map.of(\"status\", \"ok\");\n    }\n}",
    # ----------------------------------------------------------------- C#
    "cs-hello": 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, ChimCode!");\n    }\n}',
    "cs-linq": "using System.Linq;\n\nvar nums = new[] { 1, 2, 3, 4, 5, 6 };\nvar evens = nums.Where(n => n % 2 == 0).ToArray();",
    "cs-async": "using System.Net.Http;\nusing System.Threading.Tasks;\n\nasync Task<string> Load() {\n    var http = new HttpClient();\n    return await http.GetStringAsync(\"https://example.com\");\n}",
    # ----------------------------------------------------------------- Go
    "go-hello": 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, ChimCode!")\n}',
    "go-goroutines": 'package main\n\nimport "fmt"\n\nfunc main() {\n    ch := make(chan int)\n    go func() { ch <- 42 }()\n    fmt.Println(<-ch)\n}',
    "go-server": 'package main\n\nimport (\n    "fmt"\n    "net/http"\n)\n\nfunc main() {\n    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {\n        fmt.Fprint(w, "ok")\n    })\n    http.ListenAndServe(":8080", nil)\n}',
    # --------------------------------------------------------------- Rust
    "rust-hello": 'fn main() {\n    println!("Hello, ChimCode!");\n}',
    "rust-ownership": "fn length(s: &str) -> usize {\n    s.len()\n}",
    "rust-errors": "fn parse_num(s: &str) -> Result<i32, std::num::ParseIntError> {\n    Ok(s.parse()?)\n}",
    # ---------------------------------------------------------------- SQL
    "sql-select": "SELECT name, age\nFROM users\nWHERE age >= 18\nORDER BY age DESC;",
    "sql-join": "SELECT u.name, COUNT(o.id) AS orders\nFROM users u\nJOIN orders o ON o.user_id = u.id\nGROUP BY u.name;",
    # --------------------------------------------------------------- Bash
    "bash-basics": '#!/usr/bin/env bash\nNAME="ChimCode"\necho "Hello, $NAME"',
    "bash-loops": '#!/usr/bin/env bash\nfor f in *.txt; do\n  echo "found $f"\ndone',
    "bash-automation": '#!/usr/bin/env bash\nset -euo pipefail\nDIR="${1:-.}"\nfind "$DIR" -name "*.py" | wc -l',
    # ----------------------------------------------------------- HTML/CSS
    "web-structure": "<!DOCTYPE html>\n<html>\n  <body>\n    <h1>ChimCode</h1>\n  </body>\n</html>",
    "web-css": ".card {\n  display: flex;\n  border-radius: 12px;\n}",
    "web-animation": ".glow {\n  transition: transform 0.3s ease;\n}\n.glow:hover {\n  transform: scale(1.05);\n}",
    "web-responsive": "@media (min-width: 768px) {\n  .grid {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n  }\n}",
    # ------------------------------------------------------- Python deep
    "py-comprehensions": "grid = [[1, 2], [3, 4]]\nflat = [cell for row in grid for cell in row]\nprint(flat)",
    "py-context-managers": "class Timer:\n    def __enter__(self):\n        return self\n\n    def __exit__(self, *exc):\n        pass",
    "py-typing": "from dataclasses import dataclass\n\n@dataclass\nclass Point:\n    x: int\n    y: int",
    "py-concurrency": "from concurrent.futures import ThreadPoolExecutor\n\nwith ThreadPoolExecutor(max_workers=4) as pool:\n    results = list(pool.map(str.upper, ['a', 'b', 'c']))\nprint(results)",
    "py-subprocess": "import subprocess\n\nresult = subprocess.run(['echo', 'hi'], capture_output=True, text=True, check=True)\nprint(result.stdout.strip())",
    "py-security": "import secrets, hashlib\n\ntoken = secrets.token_urlsafe(32)\nsalt = secrets.token_bytes(16)\ndigest = hashlib.pbkdf2_hmac('sha256', b'pw', salt, 200_000)\nprint(len(token), len(digest))",
    # --------------------------------------------------------------- Kotlin
    "kt-hello": 'fun main() {\n    println("Hello, ChimCode!")\n}',
    "kt-null-safety": "val name: String? = null\nval n = name?.length ?: 0\nprintln(n)",
    # ---------------------------------------------------------------- Swift
    "sw-hello": 'print("Hello, ChimCode!")',
    "sw-optionals": "let name: String? = nil\nlet safe = name ?? \"guest\"\nprint(safe)",
    # -------------------------------------------------------------------- R
    "r-basics": "scores <- c(90, 80, 100)\nprint(mean(scores))",
    # ------------------------------------------------------------------ PHP
    "php-basics": '<?php\necho "Hello, ChimCode!";\n?>',
    # ------------------------------------------------------------------ Lua
    "lua-basics": 'local name = "Ada"\nprint("Hello, " .. name)',
    # ------------------------------------------------ more per new language
    "kt-collections": "val nums = listOf(1, 2, 3, 4, 5, 6)\nval evens = nums.filter { it % 2 == 0 }\nprintln(evens)",
    "sw-collections": "let nums = [1, 2, 3, 4, 5, 6]\nlet evens = nums.filter { $0 % 2 == 0 }\nprint(evens)",
    "r-dataframes": "df <- data.frame(age = c(12, 30, 45))\nprint(summary(df$age))",
    "php-forms": '<?php\nif (isset($_POST["name"])) {\n  echo htmlspecialchars($_POST["name"]);\n}\n?>',
    "lua-tables": 'local t = {10, 20, 30}\nfor i, v in ipairs(t) do\n    print(i, v)\nend',
}
