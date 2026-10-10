"""Lessons for Java, C#, Go, Rust, SQL and Bash."""
from __future__ import annotations

from .schema import Lesson, Quiz, contains, not_contains, regex

LESSONS: list[Lesson] = []


def _l(lang: str, **kw) -> None:
    kw.setdefault("language", lang)
    LESSONS.append(Lesson(**kw))


# ------------------------------------------------------------------------ Java
_l(
    "java",
    id="java-hello",
    title="Hello, Java",
    concept="class, main, System.out",
    level="beginner",
    minutes=8,
    theory=[
        "All Java code lives inside classes.",
        "Execution starts at public static void main(String[] args).",
        "System.out.println() prints a line.",
    ],
    example='public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}',
    task='Print exactly: Hello, ChimCode! from main.',
    starter="public class Main {\n    public static void main(String[] args) {\n        \n    }\n}",
    checks=[
        contains("class Main", "Define the Main class."),
        contains("main(", "Add the main method."),
        contains("Hello, ChimCode!", "Print the exact text."),
    ],
    hints=['System.out.println("Hello, ChimCode!");', "End statements with a semicolon."],
    quiz=Quiz(
        question="Which method is the entry point?",
        options=["start()", "main()", "run()", "init()"],
        answer=1,
        explanation="Java starts at main(String[] args).",
    ),
    tags=["basics"],
)
_l(
    "java",
    id="java-oop",
    title="Classes and inheritance",
    concept="fields, methods, extends",
    level="intermediate",
    minutes=14,
    theory=[
        "Classes have fields and methods; constructors initialise them.",
        "extends inherits behaviour from a parent class.",
        "@Override documents that a method replaces a parent's.",
    ],
    example="class Animal {\n    String name;\n    Animal(String name) { this.name = name; }\n    String sound() { return \"...\"; }\n}\nclass Dog extends Animal {\n    Dog(String name) { super(name); }\n    @Override String sound() { return \"woof\"; }\n}",
    task="Create a class Dog extending Animal that overrides sound() to return 'woof'.",
    starter="class Animal {\n    String sound() { return \"...\"; }\n}\n\n",
    checks=[
        contains("extends", "Use inheritance with extends."),
        contains("@Override", "Annotate the override."),
        contains("woof", "Return the dog sound."),
    ],
    hints=["class Dog extends Animal {", "@Override String sound() { return \"woof\"; }"],
    quiz=Quiz(
        question="Which keyword inherits from a class?",
        options=["implements", "extends", "inherits", "uses"],
        answer=1,
        explanation="extends inherits from a superclass.",
    ),
    tags=["oop"],
)
_l(
    "java",
    id="java-collections",
    title="Collections",
    concept="List, Map, generics",
    level="intermediate",
    minutes=13,
    theory=[
        "ArrayList is a resizable list; HashMap maps keys to values.",
        "Generics type collections: List<String>.",
        "Enhanced for loops read each element.",
    ],
    example="import java.util.*;\n\nList<String> names = new ArrayList<>();\nnames.add(\"Ada\");\nfor (String n : names) {\n    System.out.println(n);\n}",
    task="Create an ArrayList<String>, add 'Ada' and print each element.",
    starter="import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}",
    checks=[
        contains("ArrayList", "Use an ArrayList."),
        contains("add(", "Add an element."),
        contains("for", "Loop over the collection."),
    ],
    hints=["List<String> names = new ArrayList<>();", "names.add(\"Ada\");"],
    quiz=Quiz(
        question="Which class maps keys to values?",
        options=["ArrayList", "HashMap", "LinkedList", "HashSet"],
        answer=1,
        explanation="HashMap stores key/value pairs.",
    ),
    tags=["collections"],
)
_l(
    "java",
    id="java-spring",
    title="Build a Spring Boot API",
    concept="Spring Boot, @RestController, mappings",
    level="expert",
    minutes=24,
    theory=[
        "@RestController marks a class as an HTTP endpoint provider.",
        "@GetMapping maps GET requests to a method.",
        "Spring Boot starts an embedded server with SpringApplication.run.",
    ],
    example="@RestController\nclass StatusController {\n    @GetMapping(\"/health\")\n    Map<String, String> health() {\n        return Map.of(\"status\", \"ok\");\n    }\n}",
    task="Write a @RestController with a @GetMapping('/health') returning a status map.",
    starter="import org.springframework.web.bind.annotation.*;\nimport java.util.*;\n\n",
    checks=[
        contains("@RestController", "Annotate the controller."),
        contains("@GetMapping", "Map a GET route."),
        contains("health", "Name the route /health."),
    ],
    hints=["@RestController", "@GetMapping(\"/health\")"],
    quiz=Quiz(
        question="What does @GetMapping do?",
        options=["Starts a DB", "Maps GET requests", "Creates a thread", "Logs output"],
        answer=1,
        explanation="It binds a GET request to the method.",
    ),
    tags=["server", "spring", "project"],
)

# -------------------------------------------------------------------------- C#
_l(
    "csharp",
    id="cs-hello",
    title="Hello, C#",
    concept="class, Main, Console",
    level="beginner",
    minutes=8,
    theory=[
        "C# programs run from a Main method.",
        "Console.WriteLine prints a line.",
        "using directives import namespaces.",
    ],
    example="using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine(\"Hello, world!\");\n    }\n}",
    task='Print exactly: Hello, ChimCode! from Main.',
    starter="using System;\n\nclass Program {\n    static void Main() {\n        \n    }\n}",
    checks=[
        contains("Main", "Add a Main method."),
        contains("Console.WriteLine", "Print with Console.WriteLine."),
        contains("Hello, ChimCode!", "Print the exact text."),
    ],
    hints=['Console.WriteLine("Hello, ChimCode!");', "Semicolons end statements."],
    quiz=Quiz(
        question="Which namespace holds Console?",
        options=["System.IO", "System", "System.Net", "System.Linq"],
        answer=1,
        explanation="Console lives in the System namespace.",
    ),
    tags=["basics"],
)
_l(
    "csharp",
    id="cs-linq",
    title="LINQ queries",
    concept="IEnumerable, Where, Select",
    level="intermediate",
    minutes=13,
    theory=[
        "LINQ queries collections with readable chains.",
        "Where filters, Select projects, OrderBy sorts.",
        "Queries are lazy until enumerated.",
    ],
    example="using System.Linq;\n\nvar nums = new[] { 1, 2, 3, 4 };\nvar evens = nums.Where(n => n % 2 == 0).ToArray();",
    task="Use LINQ to keep only even numbers from an array.",
    starter="using System.Linq;\n\nvar nums = new[] { 1, 2, 3, 4, 5, 6 };\n",
    checks=[
        contains(".Where(", "Use the Where method."),
        contains("=>", "Pass a lambda predicate."),
        contains("%", "Test evenness with modulo."),
    ],
    hints=["nums.Where(n => n % 2 == 0)", ".ToArray() materialises it."],
    quiz=Quiz(
        question="Which LINQ method transforms each element?",
        options=["Where", "Select", "OrderBy", "Count"],
        answer=1,
        explanation="Select projects each item.",
    ),
    tags=["linq"],
)
_l(
    "csharp",
    id="cs-async",
    title="Async and Task",
    concept="async, await, Task",
    level="advanced",
    minutes=15,
    theory=[
        "async methods return Task or Task<T>.",
        "await waits for a task without blocking the thread.",
        "HttpClient performs async HTTP calls.",
    ],
    example="using System.Net.Http;\nusing System.Threading.Tasks;\n\nasync Task<string> Load() {\n    var http = new HttpClient();\n    return await http.GetStringAsync(\"https://example.com\");\n}",
    task="Write an async method Load() returning the body of a GET request.",
    starter="using System.Net.Http;\nusing System.Threading.Tasks;\n\n",
    checks=[
        contains("async", "Mark the method async."),
        contains("await", "Await the request."),
        contains("Task", "Return a Task."),
    ],
    hints=["async Task<string> Load()", "await http.GetStringAsync(url);"],
    quiz=Quiz(
        question="What does await do?",
        options=["Blocks the thread", "Frees the thread until done", "Starts a timer", "Cancels a task"],
        answer=1,
        explanation="await yields the thread while the task runs.",
    ),
    tags=["async"],
)

# -------------------------------------------------------------------------- Go
_l(
    "go",
    id="go-hello",
    title="Hello, Go",
    concept="package, func main, fmt",
    level="beginner",
    minutes=7,
    theory=[
        "Every Go file belongs to a package; runnable programs use package main.",
        "func main() is the entry point.",
        "fmt.Println prints a line.",
    ],
    example='package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, world!")\n}',
    task='Print exactly: Hello, ChimCode! from main.',
    starter='package main\n\nimport "fmt"\n\nfunc main() {\n    \n}',
    checks=[
        contains("package main", "Use package main."),
        contains("fmt.Println", "Print with fmt.Println."),
        contains("Hello, ChimCode!", "Print the exact text."),
    ],
    hints=['fmt.Println("Hello, ChimCode!")', "Go does not use semicolons."],
    quiz=Quiz(
        question="Which package is required for a runnable program?",
        options=["main", "fmt", "os", "core"],
        answer=0,
        explanation="package main produces an executable.",
    ),
    tags=["basics"],
)
_l(
    "go",
    id="go-goroutines",
    title="Goroutines and channels",
    concept="go keyword, channels, sync",
    level="intermediate",
    minutes=15,
    theory=[
        "The go keyword runs a function concurrently.",
        "Channels pass values safely between goroutines.",
        "sync.WaitGroup waits for a set of goroutines to finish.",
    ],
    example='ch := make(chan int)\ngo func() { ch <- 42 }()\nfmt.Println(<-ch)',
    task="Start a goroutine that sends 42 into a channel and print the received value.",
    starter='package main\n\nimport "fmt"\n\nfunc main() {\n    \n}',
    checks=[
        contains("go ", "Start a goroutine with go."),
        contains("make(chan", "Create a channel."),
        contains("<-", "Send or receive on the channel."),
    ],
    hints=["ch := make(chan int)", "go func() { ch <- 42 }()"],
    quiz=Quiz(
        question="What does the go keyword do?",
        options=["Blocks", "Runs concurrently", "Loops", "Exports"],
        answer=1,
        explanation="go schedules the function to run concurrently.",
    ),
    tags=["concurrency"],
)
_l(
    "go",
    id="go-server",
    title="Build an HTTP server",
    concept="net/http, handlers",
    level="expert",
    minutes=18,
    theory=[
        "net/http serves requests with handler functions.",
        "http.HandleFunc registers a path to a function.",
        "w.Write writes the response body.",
    ],
    example='http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {\n    fmt.Fprint(w, "ok")\n})\nhttp.ListenAndServe(":8080", nil)',
    task="Register a /health handler that writes 'ok' and listen on :8080.",
    starter='package main\n\nimport (\n    "fmt"\n    "net/http"\n)\n\nfunc main() {\n    \n}',
    checks=[
        contains("HandleFunc", "Register a handler with HandleFunc."),
        contains("/health", "Use the /health path."),
        contains("ListenAndServe", "Start the server."),
    ],
    hints=['http.HandleFunc("/health", handler)', 'http.ListenAndServe(":8080", nil)'],
    quiz=Quiz(
        question="Which type is the response writer?",
        options=["http.Request", "http.ResponseWriter", "http.Handler", "http.Server"],
        answer=1,
        explanation="Handlers receive a ResponseWriter and a Request.",
    ),
    tags=["server", "project"],
)

# ------------------------------------------------------------------------ Rust
_l(
    "rust",
    id="rust-hello",
    title="Hello, Rust",
    concept="fn main, println!",
    level="beginner",
    minutes=7,
    theory=[
        "Rust programs start at fn main().",
        "println! is a macro that prints a line.",
        "cargo build and cargo run manage projects.",
    ],
    example='fn main() {\n    println!("Hello, world!");\n}',
    task='Print exactly: Hello, ChimCode! from main.',
    starter="fn main() {\n    \n}",
    checks=[
        contains("fn main", "Define fn main."),
        contains("println!", "Print with the println! macro."),
        contains("Hello, ChimCode!", "Print the exact text."),
    ],
    hints=['println!("Hello, ChimCode!");', "Macros end with an exclamation mark."],
    quiz=Quiz(
        question="Which is Rust's build tool?",
        options=["npm", "cargo", "gradle", "make"],
        answer=1,
        explanation="cargo builds and runs Rust projects.",
    ),
    tags=["basics"],
)
_l(
    "rust",
    id="rust-ownership",
    title="Ownership and borrowing",
    concept="ownership, borrow, lifetimes",
    level="intermediate",
    minutes=16,
    theory=[
        "Each value has one owner; when the owner goes out of scope the value drops.",
        "Borrowing lets code use a value without taking ownership: &value.",
        "The borrow checker stops data races at compile time.",
    ],
    example="fn length(s: &str) -> usize {\n    s.len()\n}",
    task="Write a function length(s: &str) that returns the string length.",
    starter="",
    checks=[
        contains("fn length", "Define the function."),
        contains("&str", "Borrow the string with &str."),
        contains(".len()", "Return the length."),
    ],
    hints=["fn length(s: &str) -> usize", "s.len()"],
    quiz=Quiz(
        question="What does & create?",
        options=["A copy", "A borrow", "A clone", "A thread"],
        answer=1,
        explanation="& borrows a value without moving ownership.",
    ),
    tags=["ownership"],
)
_l(
    "rust",
    id="rust-errors",
    title="Result and Option",
    concept="Result, Option, ?, match",
    level="advanced",
    minutes=15,
    theory=[
        "Result<T, E> is either Ok(T) or Err(E).",
        "Option<T> is Some(T) or None.",
        "The ? operator propagates errors concisely.",
    ],
    example="fn read(n: &str) -> Result<i32, std::num::ParseIntError> {\n    let v: i32 = n.parse()?;\n    Ok(v)\n}",
    task="Write a function parse_num that returns Result<i32, _> using the ? operator.",
    starter="",
    checks=[
        contains("Result<", "Return a Result."),
        contains("?", "Use the ? operator."),
        contains("Ok(", "Return Ok on success."),
    ],
    hints=["fn parse_num(s: &str) -> Result<i32, std::num::ParseIntError>", "Ok(s.parse()?)"],
    quiz=Quiz(
        question="What does Option::None mean?",
        options=["An error", "No value", "Zero", "Null pointer"],
        answer=1,
        explanation="None means the value is absent.",
    ),
    tags=["errors"],
)

# ------------------------------------------------------------------------- SQL
_l(
    "sql",
    id="sql-select",
    title="SELECT queries",
    concept="SELECT, FROM, WHERE",
    level="beginner",
    minutes=8,
    theory=[
        "SELECT chooses columns; FROM chooses the table.",
        "WHERE filters rows.",
        "ORDER BY sorts results.",
    ],
    example="SELECT name, age\nFROM users\nWHERE age >= 18\nORDER BY age DESC;",
    task="Select all columns from users where age is at least 18.",
    starter="",
    checks=[
        contains("SELECT", "Use SELECT."),
        contains("FROM users", "Query the users table."),
        contains("WHERE", "Filter with WHERE."),
    ],
    hints=["SELECT * FROM users", "WHERE age >= 18"],
    quiz=Quiz(
        question="Which clause filters rows?",
        options=["SELECT", "FROM", "WHERE", "ORDER BY"],
        answer=2,
        explanation="WHERE keeps rows matching a condition.",
    ),
    tags=["basics"],
)
_l(
    "sql",
    id="sql-join",
    title="Joins and aggregation",
    concept="JOIN, GROUP BY, COUNT",
    level="intermediate",
    minutes=14,
    theory=[
        "JOIN combines rows from related tables on a key.",
        "GROUP BY collapses rows for aggregation.",
        "COUNT, SUM and AVG summarise groups.",
    ],
    example="SELECT u.name, COUNT(o.id) AS orders\nFROM users u\nJOIN orders o ON o.user_id = u.id\nGROUP BY u.name;",
    task="Join users to orders and count orders per user.",
    starter="",
    checks=[
        contains("JOIN", "Use a JOIN."),
        contains("ON", "Join on the matching key."),
        contains("GROUP BY", "Group the results."),
        contains("COUNT(", "Aggregate with COUNT."),
    ],
    hints=["JOIN orders o ON o.user_id = u.id", "GROUP BY u.name"],
    quiz=Quiz(
        question="What does GROUP BY do?",
        options=["Sorts rows", "Collapses rows for aggregation", "Joins tables", "Deletes rows"],
        answer=1,
        explanation="GROUP BY creates groups for aggregate functions.",
    ),
    tags=["joins"],
)

# ------------------------------------------------------------------------ Bash
_l(
    "bash",
    id="bash-basics",
    title="Shell scripting basics",
    concept="echo, variables, chmod",
    level="beginner",
    minutes=8,
    theory=[
        "A shebang line #!/usr/bin/env bash makes a script executable.",
        "Variables are set without spaces: NAME=value, and used as $NAME.",
        "chmod +x script.sh marks a file runnable.",
    ],
    example='#!/usr/bin/env bash\nNAME="ChimCode"\necho "Hello, $NAME"',
    task='Write a script that sets NAME to ChimCode and echoes "Hello, $NAME".',
    starter="#!/usr/bin/env bash\n",
    checks=[
        contains("#!/usr/bin/env bash", "Start with a shebang."),
        contains("NAME=", "Set a NAME variable."),
        contains("echo", "Echo the greeting."),
    ],
    hints=['NAME="ChimCode"', 'echo "Hello, $NAME"'],
    quiz=Quiz(
        question="How do you read a shell variable?",
        options=["$NAME", "{{NAME}}", "%NAME%", "@NAME"],
        answer=0,
        explanation="Prefix the name with $ to expand it.",
    ),
    tags=["basics"],
)
_l(
    "bash",
    id="bash-loops",
    title="Loops and conditions",
    concept="for, if, test",
    level="intermediate",
    minutes=11,
    theory=[
        "for f in *.txt loops over files.",
        "if [ -f file ] tests conditions.",
        "&& runs the next command only on success.",
    ],
    example='for f in *.txt; do\n  echo "found $f"\ndone',
    task="Loop over all .txt files and echo each name.",
    starter="#!/usr/bin/env bash\n",
    checks=[
        contains("for", "Use a for loop."),
        contains("*.txt", "Match .txt files."),
        contains("done", "Close the loop with done."),
    ],
    hints=["for f in *.txt; do", "echo \"$f\"; done"],
    quiz=Quiz(
        question="Which test checks that a file exists?",
        options=["[ -f file ]", "[ -d file ]", "[ -x file ]", "[ -z file ]"],
        answer=0,
        explanation="-f is true when the path is a regular file.",
    ),
    tags=["loops"],
)
_l(
    "bash",
    id="bash-automation",
    title="Automation scripts",
    concept="pipes, arguments, cron",
    level="advanced",
    minutes=14,
    theory=[
        "$1, $2 are positional arguments; $# is the count.",
        "Pipes send one command's output into the next: ls | grep py.",
        "cron schedules scripts to run on a timetable.",
    ],
    example='#!/usr/bin/env bash\nset -euo pipefail\nDIR="${1:-.}"\nfind "$DIR" -name "*.py" | wc -l',
    task="Write a script that counts .py files under the directory given as $1.",
    starter="#!/usr/bin/env bash\n",
    checks=[
        contains("$1", "Read the first argument."),
        contains("|", "Pipe output into another command."),
        contains("find", "Use find to locate files."),
    ],
    hints=["DIR=\"${1:-.}\"", "find \"$DIR\" -name '*.py' | wc -l"],
    quiz=Quiz(
        question="What does set -euo pipefail do?",
        options=["Speeds up the script", "Makes errors fail fast", "Logs output", "Installs tools"],
        answer=1,
        explanation="It makes the script exit on errors and undefined variables.",
    ),
    tags=["automation"],
)
