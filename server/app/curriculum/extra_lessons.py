"""Additional languages and deep-dive lessons.

These extend the catalogue well beyond the introductory tracks: more Python
internals, plus Kotlin, Swift, R, PHP and Lua.
"""
from __future__ import annotations

from .schema import Lesson, Quiz, contains, min_lines, not_contains, regex

LESSONS: list[Lesson] = []


def _l(lang: str, **kw) -> None:
    kw.setdefault("language", lang)
    LESSONS.append(Lesson(**kw))


# ------------------------------------------------------------------ Python deep
_l(
    "python",
    id="py-comprehensions",
    title="Comprehensions and generators in depth",
    concept="nested comprehensions, generator expressions, lazy evaluation",
    level="intermediate",
    minutes=18,
    theory=[
        "A list comprehension replaces a loop that only builds a list.",
        "Generator expressions use parentheses and produce items lazily, one at a time.",
        "Nested comprehensions flatten structures: [cell for row in grid for cell in row].",
        "Lazy generation matters when the data set is large or infinite.",
    ],
    example=(
        "grid = [[1, 2], [3, 4]]\n"
        "flat = [cell for row in grid for cell in row]\n"
        "squares = (n * n for n in range(5))\n"
        "print(flat, list(squares))"
    ),
    task="Flatten the grid with a nested comprehension and print the result.",
    starter="grid = [[1, 2], [3, 4]]\n",
    checks=[
        contains("for row in grid", "Loop over the rows inside the comprehension."),
        contains("for cell in row", "Then loop over the cells of each row."),
        contains("print(", "Print the flattened list."),
    ],
    hints=["[cell for row in grid for cell in row]", "Wrap it in print()."],
    quiz=Quiz(
        question="What is the main advantage of a generator expression?",
        options=["It is shorter", "It produces values lazily", "It is faster to index", "It sorts the data"],
        answer=1,
        explanation="Generators compute values on demand instead of building a whole list.",
    ),
    tags=["pythonic", "performance"],
)
_l(
    "python",
    id="py-context-managers",
    title="Context managers and __enter__/__exit__",
    concept="with, __enter__, __exit__, contextlib",
    level="advanced",
    minutes=20,
    theory=[
        "The with statement calls __enter__ on the way in and __exit__ on the way out.",
        "That guarantees cleanup even when an exception is raised.",
        "contextlib.contextmanager turns a generator into a context manager.",
    ],
    example=(
        "from contextlib import contextmanager\n\n"
        "@contextmanager\n"
        "def tag(name):\n"
        "    print('<%s>' % name)\n"
        "    yield\n"
        "    print('</%s>' % name)"
    ),
    task="Write a class Timer with __enter__ and __exit__ so it can be used in a with block.",
    starter="class Timer:\n",
    checks=[
        contains("class Timer", "Define a class named Timer."),
        contains("def __enter__", "Add __enter__."),
        contains("def __exit__", "Add __exit__."),
    ],
    hints=["def __enter__(self): return self", "def __exit__(self, *exc): pass"],
    quiz=Quiz(
        question="When does __exit__ run?",
        options=["Only on success", "Only on failure", "Always when the block ends", "Never automatically"],
        answer=2,
        explanation="__exit__ always runs, which is what makes cleanup reliable.",
    ),
    tags=["advanced", "idioms"],
)
_l(
    "python",
    id="py-typing",
    title="Type hints and dataclasses",
    concept="annotations, typing, @dataclass, Optional",
    level="intermediate",
    minutes=17,
    theory=[
        "Type hints document intent and let tools catch mistakes: def f(x: int) -> str.",
        "Optional[T] means a value may be T or None.",
        "@dataclass generates __init__ and friends from annotated fields.",
    ],
    example="from dataclasses import dataclass\n\n@dataclass\nclass Point:\n    x: int\n    y: int",
    task="Define a dataclass Point with x and y, both typed int.",
    starter="from dataclasses import dataclass\n\n",
    checks=[
        contains("@dataclass", "Decorate the class with @dataclass."),
        contains("class Point", "Name the class Point."),
        contains("x: int", "Annotate x as int."),
        contains("y: int", "Annotate y as int."),
    ],
    hints=["@dataclass", "class Point:"],
    quiz=Quiz(
        question="What does Optional[str] allow?",
        options=["Any string", "A string or None", "Only None", "A list of strings"],
        answer=1,
        explanation="Optional means the value may be absent (None).",
    ),
    tags=["typing", "quality"],
)
_l(
    "python",
    id="py-concurrency",
    title="Threads, processes and the GIL",
    concept="threading, multiprocessing, GIL, concurrent.futures",
    level="advanced",
    minutes=22,
    theory=[
        "Threads share memory but the GIL means only one runs Python bytecode at a time.",
        "Threads still help for I/O-bound work, because waiting releases the GIL.",
        "Processes have separate memory and true parallelism, at a higher cost.",
        "concurrent.futures gives a clean pool API for both.",
    ],
    example=(
        "from concurrent.futures import ThreadPoolExecutor\n\n"
        "with ThreadPoolExecutor(max_workers=4) as pool:\n"
        "    results = list(pool.map(str.upper, ['a', 'b', 'c']))\n"
        "print(results)"
    ),
    task="Use a ThreadPoolExecutor to map str.upper over three letters and print the results.",
    starter="from concurrent.futures import ThreadPoolExecutor\n\n",
    checks=[
        contains("ThreadPoolExecutor", "Create a thread pool."),
        contains("map(", "Use pool.map to run the work."),
        contains("print(", "Print the results."),
    ],
    hints=["with ThreadPoolExecutor() as pool:", "list(pool.map(str.upper, data))"],
    quiz=Quiz(
        question="Which is best for CPU-heavy work in Python?",
        options=["Threads", "Processes", "Neither", "Async"],
        answer=1,
        explanation="The GIL limits threads for CPU work, so use processes.",
    ),
    tags=["concurrency", "performance"],
)
_l(
    "python",
    id="py-subprocess",
    title="Running programs with subprocess",
    concept="subprocess.run, check, capture_output",
    level="advanced",
    minutes=16,
    theory=[
        "subprocess.run launches another program and waits for it.",
        "check=True raises if the program exits with a failure code.",
        "capture_output=True collects stdout and stderr for inspection.",
    ],
    example=(
        "import subprocess\n\n"
        "result = subprocess.run(['echo', 'hi'], capture_output=True, text=True, check=True)\n"
        "print(result.stdout.strip())"
    ),
    task="Run the command 'echo hi' with subprocess and print its output.",
    starter="import subprocess\n\n",
    checks=[
        contains("subprocess.run(", "Use subprocess.run to launch the program."),
        contains("capture_output", "Capture the output."),
        contains("print(", "Print what it produced."),
    ],
    hints=["subprocess.run([...], capture_output=True, text=True)", "result.stdout"],
    quiz=Quiz(
        question="What does check=True do?",
        options=["Runs twice", "Raises on a failing exit code", "Hides output", "Runs in a shell"],
        answer=1,
        explanation="check=True surfaces failures as exceptions.",
    ),
    tags=["system", "automation"],
)
_l(
    "python",
    id="py-security",
    title="Safer Python: secrets, hashing and injection",
    concept="secrets, hashlib, parameterised SQL, never eval input",
    level="advanced",
    minutes=20,
    theory=[
        "Never use random for secrets. Use the secrets module instead.",
        "Hash passwords with a slow algorithm such as pbkdf2 or bcrypt, plus a salt.",
        "Never build SQL with string formatting. Use parameterised queries.",
        "Never eval() untrusted input — it runs arbitrary code.",
    ],
    example=(
        "import secrets, hashlib\n\n"
        "token = secrets.token_urlsafe(32)\n"
        "salt = secrets.token_bytes(16)\n"
        "digest = hashlib.pbkdf2_hmac('sha256', b'pw', salt, 200_000)\n"
        "print(len(token), len(digest))"
    ),
    task="Generate a secure token with secrets and a salted hash with hashlib.pbkdf2_hmac.",
    starter="import secrets, hashlib\n\n",
    checks=[
        contains("secrets.", "Use the secrets module for anything sensitive."),
        contains("pbkdf2_hmac", "Use a slow, salted hash for passwords."),
        not_contains("eval(", "Never eval untrusted input."),
    ],
    hints=["secrets.token_urlsafe(32)", "hashlib.pbkdf2_hmac('sha256', pw, salt, 200000)"],
    quiz=Quiz(
        question="Why is hashlib.pbkdf2_hmac better than sha256 alone for passwords?",
        options=["Shorter output", "It is deliberately slow and salted", "It is reversible", "It uses less memory"],
        answer=1,
        explanation="Slow, salted hashing makes brute force far more expensive.",
    ),
    tags=["security", "important"],
)

# ----------------------------------------------------------------------- Kotlin
_l(
    "kotlin",
    id="kt-hello",
    title="Hello, Kotlin",
    concept="fun main, println, val and var",
    level="beginner",
    minutes=8,
    theory=[
        "Kotlin runs on the JVM and is the modern language for Android.",
        "fun main() is the entry point.",
        "val is an immutable binding; var is reassignable.",
    ],
    example='fun main() {\n    val name = "Ada"\n    println("Hello, $name!")\n}',
    task='Print exactly: Hello, ChimCode!',
    starter="fun main() {\n    \n}",
    checks=[
        contains("fun main", "Define fun main()."),
        contains("println", "Print with println."),
        contains("Hello, ChimCode!", "Print the exact text."),
    ],
    hints=['println("Hello, ChimCode!")', "Kotlin has no semicolons required."],
    quiz=Quiz(
        question="Which keyword makes an immutable value?",
        options=["var", "val", "let", "const"],
        answer=1,
        explanation="val cannot be reassigned.",
    ),
    tags=["basics"],
)
_l(
    "kotlin",
    id="kt-null-safety",
    title="Null safety",
    concept="nullable types, ?., ?:, !!",
    level="intermediate",
    minutes=14,
    theory=[
        "Adding ? makes a type nullable: String?.",
        "?. calls safely and returns null if the receiver is null.",
        "?: supplies a default. !! asserts non-null and throws if wrong.",
    ],
    example='val name: String? = null\nprintln(name?.length ?: 0)',
    task="Safely read the length of a nullable name, defaulting to 0.",
    starter="val name: String? = null\n",
    checks=[
        contains("String?", "Declare a nullable String."),
        contains("?.", "Use the safe call operator."),
        contains("?:", "Provide a default with the Elvis operator."),
    ],
    hints=["name?.length", "?: 0"],
    quiz=Quiz(
        question="What does !! do?",
        options=["Ignores null", "Throws if null", "Returns null", "Converts to nullable"],
        answer=1,
        explanation="!! asserts non-null and fails loudly if it is null.",
    ),
    tags=["types"],
)

# ------------------------------------------------------------------------ Swift
_l(
    "swift",
    id="sw-hello",
    title="Hello, Swift",
    concept="print, let/var, string interpolation",
    level="beginner",
    minutes=8,
    theory=[
        "Swift is Apple's language for iOS, macOS and more.",
        "let is a constant; var is a variable.",
        "String interpolation uses \\( ).",
    ],
    example='let name = "Ada"\nprint("Hello, \\(name)!")',
    task='Print exactly: Hello, ChimCode!',
    starter="",
    checks=[
        contains("print(", "Print with print."),
        contains("Hello, ChimCode!", "Print the exact text."),
    ],
    hints=['print("Hello, ChimCode!")'],
    quiz=Quiz(
        question="Which declares a constant in Swift?",
        options=["var", "let", "const", "final"],
        answer=1,
        explanation="let creates a constant binding.",
    ),
    tags=["basics"],
)
_l(
    "swift",
    id="sw-optionals",
    title="Optionals and guard",
    concept="Optional, if let, guard let, ??",
    level="intermediate",
    minutes=14,
    theory=[
        "An Optional may hold a value or nil.",
        "if let unwraps safely inside a block.",
        "guard let exits early when a value is missing.",
    ],
    example="let name: String? = nil\nlet safe = name ?? \"guest\"\nprint(safe)",
    task="Unwrap a nullable name with the ?? operator, defaulting to 'guest'.",
    starter="let name: String? = nil\n",
    checks=[
        contains("String?", "Declare an optional String."),
        contains("??", "Use the nil-coalescing operator."),
    ],
    hints=['name ?? "guest"'],
    quiz=Quiz(
        question="What does guard let do?",
        options=["Loops", "Unwraps or exits", "Throws", "Copies"],
        answer=1,
        explanation="guard unwraps and requires the caller to exit if it fails.",
    ),
    tags=["types"],
)

# --------------------------------------------------------------------------- R
_l(
    "r",
    id="r-basics",
    title="R for data",
    concept="vectors, data frames, mean",
    level="beginner",
    minutes=12,
    theory=[
        "R is built for statistics and data analysis.",
        "c() builds a vector. mean() summarises it.",
        "A data frame is a table of columns.",
    ],
    example="scores <- c(90, 80, 100)\nprint(mean(scores))",
    task="Build a vector of three numbers and print its mean.",
    starter="",
    checks=[
        contains("c(", "Build a vector with c()."),
        contains("mean(", "Use mean() to average it."),
        contains("print(", "Print the result."),
    ],
    hints=["scores <- c(1, 2, 3)", "print(mean(scores))"],
    quiz=Quiz(
        question="What does c() do in R?",
        options=["Concatenates into a vector", "Compares values", "Copies", "Creates a table"],
        answer=0,
        explanation="c() combines values into a vector.",
    ),
    tags=["data"],
)

# ------------------------------------------------------------------------- PHP
_l(
    "php",
    id="php-basics",
    title="PHP for the web",
    concept="<?php, echo, variables, strings",
    level="beginner",
    minutes=10,
    theory=[
        "PHP runs on the server and generates HTML.",
        "Code lives inside <?php tags.",
        "Variables start with $ and concatenate with a dot.",
    ],
    example='<?php\n$name = "Ada";\necho "Hello, " . $name;\n?>',
    task="Echo the text Hello, ChimCode!",
    starter="<?php\n",
    checks=[
        contains("<?php", "Open a PHP block."),
        contains("echo", "Use echo to output."),
        contains("Hello, ChimCode!", "Print the exact text."),
    ],
    hints=['echo "Hello, ChimCode!";'],
    quiz=Quiz(
        question="How does PHP concatenate strings?",
        options=["+", ".", "&", "||"],
        answer=1,
        explanation="The dot joins strings in PHP.",
    ),
    tags=["basics", "web"],
)

# ------------------------------------------------------------------------- Lua
_l(
    "lua",
    id="lua-basics",
    title="Lua scripting",
    concept="local variables, print, tables",
    level="beginner",
    minutes=10,
    theory=[
        "Lua is a small, fast scripting language used in games.",
        "local limits a variable to the current scope.",
        "Tables are the one data structure, used for arrays and objects.",
    ],
    example='local name = "Ada"\nprint("Hello, " .. name)',
    task="Declare a local name and print 'Hello, ' joined to it with ..",
    starter="",
    checks=[
        contains("local", "Declare a local variable."),
        contains("..", "Concatenate with the .. operator."),
        contains("print(", "Print the greeting."),
    ],
    hints=['local name = "Ada"', 'print("Hello, " .. name)'],
    quiz=Quiz(
        question="What is Lua's main data structure?",
        options=["Array", "Table", "List", "Map"],
        answer=1,
        explanation="Tables serve as arrays, maps and objects.",
    ),
    tags=["basics", "gamedev"],
)

# ------------------------------------------------------------- More per language
_l(
    "kotlin",
    id="kt-collections",
    title="Collections and lambdas",
    concept="listOf, map, filter, lambdas",
    level="intermediate",
    minutes=15,
    theory=[
        "listOf builds a read-only list; mutableListOf is changeable.",
        "map transforms each element, filter keeps some.",
        "A lambda is a function you pass inline: { it * 2 }.",
    ],
    example="val nums = listOf(1, 2, 3, 4)\nval evens = nums.filter { it % 2 == 0 }\nprintln(evens)",
    task="Filter a list of numbers down to the even ones and print them.",
    starter="val nums = listOf(1, 2, 3, 4, 5, 6)\n",
    checks=[
        contains("filter", "Use filter with a lambda."),
        contains("%", "Test evenness with the modulo operator."),
        contains("println", "Print the result."),
    ],
    hints=["nums.filter { it % 2 == 0 }", "println(evens)"],
    quiz=Quiz(
        question="What does it refer to in a Kotlin lambda?",
        options=["The list", "The current element", "The index", "Nothing"],
        answer=1,
        explanation="it is the implicit name of the single parameter.",
    ),
    tags=["collections"],
)
_l(
    "swift",
    id="sw-collections",
    title="Arrays, dictionaries and closures",
    concept="Array, Dictionary, map/filter, closures",
    level="intermediate",
    minutes=15,
    theory=[
        "Arrays are ordered, dictionaries map keys to values.",
        "map and filter take closures that transform or select items.",
        "A closure is an inline function: { $0 * 2 }.",
    ],
    example="let nums = [1, 2, 3, 4]\nlet evens = nums.filter { $0 % 2 == 0 }\nprint(evens)",
    task="Filter an array of numbers to the even ones and print them.",
    starter="let nums = [1, 2, 3, 4, 5, 6]\n",
    checks=[
        contains("filter", "Use filter with a closure."),
        contains("%", "Test evenness with the modulo operator."),
        contains("print(", "Print the result."),
    ],
    hints=["nums.filter { $0 % 2 == 0 }", "print(evens)"],
    quiz=Quiz(
        question="What does $0 mean in a Swift closure?",
        options=["The first argument", "Zero", "The array", "An index"],
        answer=0,
        explanation="$0 is shorthand for the first closure parameter.",
    ),
    tags=["collections"],
)
_l(
    "r",
    id="r-dataframes",
    title="Data frames and filtering",
    concept="data.frame, subsetting, summary",
    level="intermediate",
    minutes=16,
    theory=[
        "A data frame is a table where each column has a type.",
        "df$col selects a column; df[df$col > n, ] filters rows.",
        "summary() describes every column at once.",
    ],
    example="df <- data.frame(age = c(12, 30, 45))\nprint(summary(df$age))",
    task="Build a data frame with an age column and print its summary.",
    starter="",
    checks=[
        contains("data.frame(", "Create a data frame."),
        contains("summary(", "Summarise the column."),
        contains("print(", "Print the summary."),
    ],
    hints=["df <- data.frame(age = c(1, 2, 3))", "print(summary(df$age))"],
    quiz=Quiz(
        question="How do you select a column in R?",
        options=["df->col", "df$col", "df.col", "df[col]"],
        answer=1,
        explanation="The $ operator selects a column by name.",
    ),
    tags=["data"],
)
_l(
    "php",
    id="php-forms",
    title="Handling form input",
    concept="$_POST, isset, htmlspecialchars",
    level="intermediate",
    minutes=14,
    theory=[
        "Form values arrive in $_POST for POST requests.",
        "isset() checks a value was sent before using it.",
        "htmlspecialchars() escapes output so it cannot inject HTML.",
    ],
    example='<?php\nif (isset($_POST["name"])) {\n  echo htmlspecialchars($_POST["name"]);\n}\n?>',
    task="Read a posted name safely and echo it escaped.",
    starter="<?php\n",
    checks=[
        contains("$_POST", "Read from the POST array."),
        contains("htmlspecialchars", "Escape the output."),
        contains("isset", "Check the value exists first."),
    ],
    hints=['if (isset($_POST["name"]))', 'echo htmlspecialchars($_POST["name"]);'],
    quiz=Quiz(
        question="Why escape output with htmlspecialchars?",
        options=["Speed", "Prevent HTML injection", "Formatting", "It is required"],
        answer=1,
        explanation="Escaping stops untrusted text becoming markup.",
    ),
    tags=["web", "security"],
)
_l(
    "lua",
    id="lua-tables",
    title="Tables and loops",
    concept="tables, ipairs, pairs, #",
    level="intermediate",
    minutes=14,
    theory=[
        "Tables hold arrays and key/value pairs.",
        "ipairs walks array entries in order; pairs walks all keys.",
        "#t gives the length of an array part.",
    ],
    example='local t = {10, 20, 30}\nfor i, v in ipairs(t) do\n    print(i, v)\nend',
    task="Create a table of three numbers and print each with ipairs.",
    starter="",
    checks=[
        contains("local", "Declare a local table."),
        contains("ipairs", "Walk the table with ipairs."),
        contains("print(", "Print each entry."),
    ],
    hints=["local t = {1, 2, 3}", "for i, v in ipairs(t) do"],
    quiz=Quiz(
        question="What does #t return for a table?",
        options=["All keys", "The length of the array part", "The last value", "A copy"],
        answer=1,
        explanation="# returns the number of array elements.",
    ),
    tags=["tables"],
)
