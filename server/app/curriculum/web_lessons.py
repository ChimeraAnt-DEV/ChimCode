"""Web lessons: JavaScript, TypeScript and HTML/CSS."""
from __future__ import annotations

from .schema import Lesson, Quiz, contains, not_contains, regex

LESSONS: list[Lesson] = []


def _l(lang: str, **kw) -> None:
    kw.setdefault("language", lang)
    LESSONS.append(Lesson(**kw))


# ------------------------------------------------------------------ JavaScript
_l(
    "javascript",
    id="js-hello",
    title="Hello, JavaScript",
    concept="console.log, variables, let/const",
    level="beginner",
    minutes=6,
    theory=[
        "console.log() prints to the browser or Node console.",
        "let declares a variable you may reassign; const cannot be reassigned.",
        "JavaScript runs in browsers and, via Node.js, on servers.",
    ],
    example='const name = "Ada";\nlet score = 0;\nscore = 10;\nconsole.log(`Hi ${name}, score ${score}`);',
    task='Declare a const name set to "ChimCode" and log it.',
    starter="",
    checks=[
        contains("const", "Declare the value with const."),
        contains("console.log", "Log it with console.log."),
        contains("ChimCode", "Use the text ChimCode."),
    ],
    hints=['const name = "ChimCode";', "console.log(name);"],
    quiz=Quiz(
        question="Which keyword declares a value you cannot reassign?",
        options=["var", "let", "const", "static"],
        answer=2,
        explanation="const bindings cannot be reassigned.",
    ),
    tags=["basics"],
)
_l(
    "javascript",
    id="js-functions",
    title="Functions and arrow syntax",
    concept="function, arrow functions, callbacks",
    level="beginner",
    minutes=9,
    theory=[
        "Functions group reusable logic: function add(a, b) { return a + b; }",
        "Arrow functions are shorter: const add = (a, b) => a + b;",
        "Functions are values, so you can pass them to other functions.",
    ],
    example="const square = (n) => n * n;\nconsole.log(square(4));",
    task="Write an arrow function square(n) returning n*n and log square(5).",
    starter="",
    checks=[
        contains("=>", "Use arrow function syntax."),
        contains("square", "Name the function square."),
        contains("console.log", "Log the result."),
    ],
    hints=["const square = (n) => n * n;", "console.log(square(5));"],
    quiz=Quiz(
        question="What does an arrow function without braces return?",
        options=["Nothing", "The expression", "undefined", "A promise"],
        answer=1,
        explanation="A concise arrow body implicitly returns the expression.",
    ),
    tags=["functions"],
)
_l(
    "javascript",
    id="js-arrays",
    title="Arrays and map/filter/reduce",
    concept="array methods, callbacks",
    level="intermediate",
    minutes=12,
    theory=[
        "Arrays hold ordered values: [1, 2, 3].",
        ".map transforms each item; .filter keeps some; .reduce folds to one value.",
        "These methods return new arrays instead of mutating the original.",
    ],
    example="const nums = [1, 2, 3, 4];\nconst evens = nums.filter((n) => n % 2 === 0);\nconsole.log(evens);",
    task="Given nums, use filter to keep only even numbers and log the result.",
    starter="const nums = [1, 2, 3, 4, 5, 6];\n",
    checks=[
        contains(".filter(", "Use the filter method."),
        contains("%", "Test evenness with the modulo operator."),
        contains("console.log", "Log the filtered array."),
    ],
    hints=["nums.filter((n) => n % 2 === 0)", "=== is strict equality."],
    quiz=Quiz(
        question="Which method folds an array into a single value?",
        options=["map", "filter", "reduce", "forEach"],
        answer=2,
        explanation="reduce accumulates a single result.",
    ),
    tags=["collections"],
)
_l(
    "javascript",
    id="js-async",
    title="Promises and async/await",
    concept="promises, async, await, fetch",
    level="advanced",
    minutes=16,
    theory=[
        "A Promise represents a value that will arrive later.",
        "async functions return promises; await pauses until one resolves.",
        "fetch() performs HTTP requests and returns a promise.",
    ],
    example="async function load() {\n  const res = await fetch('/api/status');\n  const data = await res.json();\n  console.log(data);\n}",
    task="Write an async function load() that awaits fetch('/api/status') and returns its json().",
    starter="async function load() {\n  \n}",
    checks=[
        contains("async", "Declare an async function."),
        contains("await", "Await the fetch call."),
        contains("fetch(", "Use fetch()."),
        contains(".json()", "Parse the response with .json()."),
    ],
    hints=["const res = await fetch('/api/status');", "return res.json();"],
    quiz=Quiz(
        question="What does await do inside an async function?",
        options=["Blocks all JS", "Waits for a promise", "Starts a thread", "Deletes a promise"],
        answer=1,
        explanation="await suspends the function until the promise settles.",
    ),
    tags=["async"],
)
_l(
    "javascript",
    id="js-node-server",
    title="Build a Node.js server",
    concept="http module, routes, JSON",
    level="expert",
    minutes=20,
    theory=[
        "Node's http module creates servers without extra dependencies.",
        "Each request triggers a callback with req and res.",
        "Set the status code and content type, then end the response.",
    ],
    example="const http = require('http');\n\nhttp.createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ status: 'ok' }));\n}).listen(3000);",
    task="Create an http server that responds with JSON {'status':'ok'} on port 3000.",
    starter="const http = require('http');\n\n",
    checks=[
        contains("createServer", "Use http.createServer."),
        contains("Content-Type", "Set a content type header."),
        contains("listen", "Listen on a port."),
        contains("JSON.stringify", "Serialise the payload."),
    ],
    hints=["res.writeHead(200, {'Content-Type':'application/json'})", "res.end(JSON.stringify({status:'ok'}))"],
    quiz=Quiz(
        question="Which method finishes an HTTP response?",
        options=["res.send", "res.end", "res.close", "res.finish"],
        answer=1,
        explanation="res.end() completes the response.",
    ),
    tags=["server", "node", "project"],
)

# ------------------------------------------------------------------ TypeScript
_l(
    "typescript",
    id="ts-types",
    title="Typed JavaScript",
    concept="type annotations, inference, interfaces",
    level="beginner",
    minutes=9,
    theory=[
        "TypeScript adds static types on top of JavaScript.",
        "Annotations look like let age: number = 21;",
        "Interfaces describe the shape of objects.",
    ],
    example="interface User {\n  name: string;\n  age: number;\n}\n\nconst u: User = { name: 'Ada', age: 21 };",
    task="Define an interface User with name: string and age: number, then create one.",
    starter="",
    checks=[
        contains("interface User", "Define an interface named User."),
        contains("string", "Use the string type."),
        contains("number", "Use the number type."),
    ],
    hints=["interface User { name: string; age: number; }", "const u: User = { name: 'Ada', age: 21 };"],
    quiz=Quiz(
        question="What does TypeScript add to JavaScript?",
        options=["Speed", "Static types", "A new runtime", "GC"],
        answer=1,
        explanation="TypeScript adds static typing that compiles to JS.",
    ),
    tags=["types"],
)
_l(
    "typescript",
    id="ts-generics",
    title="Generics and unions",
    concept="generics, union types, narrowing",
    level="intermediate",
    minutes=14,
    theory=[
        "Generics parameterise types: function first<T>(items: T[]): T",
        "Union types allow several types: string | number.",
        "Type guards narrow a union back to one type.",
    ],
    example="function first<T>(items: T[]): T | undefined {\n  return items[0];\n}",
    task="Write a generic function first<T>(items: T[]) returning the first item or undefined.",
    starter="",
    checks=[
        contains("<T>", "Use a generic type parameter."),
        contains("function first", "Name the function first."),
        contains("undefined", "Allow undefined as a return."),
    ],
    hints=["function first<T>(items: T[]): T | undefined", "return items[0];"],
    quiz=Quiz(
        question="What is string | number an example of?",
        options=["Generic", "Union", "Interface", "Enum"],
        answer=1,
        explanation="A union allows one of several types.",
    ),
    tags=["generics"],
)

# ------------------------------------------------------------------ HTML/CSS
_l(
    "htmlcss",
    id="web-structure",
    title="HTML structure",
    concept="elements, attributes, semantics",
    level="beginner",
    minutes=8,
    theory=[
        "HTML describes the structure of a page with elements and tags.",
        "Attributes configure elements, like <a href='...'>.",
        "Semantic tags such as header, main and footer describe meaning.",
    ],
    example="<!DOCTYPE html>\n<html>\n  <body>\n    <h1>ChimCode</h1>\n  </body>\n</html>",
    task="Write an <h1> heading containing ChimCode inside a <body>.",
    starter="",
    checks=[
        contains("<h1>", "Add an h1 heading."),
        contains("<body>", "Wrap content in a body."),
        contains("ChimCode", "Put ChimCode in the heading."),
    ],
    hints=["<body>", "<h1>ChimCode</h1>"],
    quiz=Quiz(
        question="Which tag is the largest heading?",
        options=["<h6>", "<h1>", "<p>", "<head>"],
        answer=1,
        explanation="<h1> is the top-level heading.",
    ),
    tags=["basics"],
)
_l(
    "htmlcss",
    id="web-css",
    title="Styling with CSS",
    concept="selectors, properties, flexbox",
    level="beginner",
    minutes=10,
    theory=[
        "CSS rules pair a selector with declarations: p { color: red; }",
        "Classes (.card) and ids (#hero) target specific elements.",
        "Flexbox lays out children with display: flex.",
    ],
    example=".card {\n  display: flex;\n  gap: 12px;\n  border-radius: 12px;\n}",
    task="Style a class .card with display flex and a 12px border radius.",
    starter="",
    checks=[
        contains(".card", "Target the .card class."),
        contains("display", "Set the display property."),
        contains("border-radius", "Round the corners."),
    ],
    hints=[".card { display: flex; }", "border-radius: 12px;"],
    quiz=Quiz(
        question="Which selector targets a class?",
        options=["#name", ".name", "name", "*name"],
        answer=1,
        explanation="A leading dot selects a class.",
    ),
    tags=["styling"],
)
_l(
    "htmlcss",
    id="web-animation",
    title="Animations and transitions",
    concept="transition, @keyframes, transform",
    level="intermediate",
    minutes=12,
    theory=[
        "transition animates property changes over time.",
        "@keyframes defines reusable animation steps.",
        "transform moves, scales and rotates elements cheaply.",
    ],
    example=".glow {\n  transition: transform 0.3s ease;\n}\n.glow:hover {\n  transform: scale(1.05);\n}",
    task="Add a hover rule that scales .glow by 1.05 with a transition.",
    starter="",
    checks=[
        contains("transition", "Add a transition."),
        contains(":hover", "Use a hover rule."),
        contains("transform", "Apply a transform."),
    ],
    hints=["transition: transform .3s ease;", ".glow:hover { transform: scale(1.05); }"],
    quiz=Quiz(
        question="Which property animates smoothly between states?",
        options=["display", "transition", "margin", "color-only"],
        answer=1,
        explanation="transition interpolates property changes.",
    ),
    tags=["animation"],
)
_l(
    "htmlcss",
    id="web-responsive",
    title="Responsive layout",
    concept="media queries, grid, units",
    level="advanced",
    minutes=14,
    theory=[
        "Media queries adapt styles to screen size: @media (min-width: 768px).",
        "CSS grid creates two-dimensional layouts.",
        "Relative units such as rem and % scale with the user's settings.",
    ],
    example="@media (min-width: 768px) {\n  .grid {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n  }\n}",
    task="Write a media query that turns .grid into two equal columns above 768px.",
    starter="",
    checks=[
        contains("@media", "Use a media query."),
        contains("grid", "Use CSS grid."),
        contains("grid-template-columns", "Define the columns."),
    ],
    hints=["@media (min-width: 768px) { ... }", "grid-template-columns: 1fr 1fr;"],
    quiz=Quiz(
        question="What does 1fr mean in a grid?",
        options=["1 pixel", "One free fraction", "One row", "Fixed 1rem"],
        answer=1,
        explanation="fr distributes free space proportionally.",
    ),
    tags=["responsive"],
)
