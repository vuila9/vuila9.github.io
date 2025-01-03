
function TodoApp() {
    const { useState } = React;

    const [todos, setTodos] = useState([]);
    const [input, setInput] = useState("");

    const addTodo = () => {
    if (input.trim()) {
        setTodos([...todos, input.trim()]);
        setInput(""); // Clear the input field
    }
    };

    const removeTodo = (index) => {
        setTodos(todos.filter((_, i) => i !== index));
    };

    return React.createElement(
        "div",
        null,
        React.createElement("h1", null, "Todo List"),
        React.createElement("input", {
            type: "text",
            value: input,
            onChange: (e) => setInput(e.target.value),
            placeholder: "Add a new task",
        }),
        React.createElement(
            "button",
            { onClick: addTodo },
            "Add"
        ),
        React.createElement(
            "ul",
            null,
            todos.map((todo, index) =>
            React.createElement(
                "li",
                { key: index },
                todo,
                React.createElement(
                "button",
                { onClick: () => removeTodo(index) },
                "Remove"
                )
            )
            )
        )
    );
}

function main() {
    const root = ReactDOM.createRoot(document.getElementById("my-react-app"));
    root.render(React.createElement(TodoApp));
}

main();



