
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

    return (
        <div>
            <h1>Todo List</h1>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Add a new TASK"
            />
            <button onClick={addTodo}>Add</button>
            <ul>
                {todos.map((todo, index) => (
                <li key={index}>
                    {todo}
                    <button onClick={() => removeTodo(index)}>Remove</button>
                </li>
                ))}
            </ul>
        </div>
    );
}

function main() {
    const root = ReactDOM.createRoot(document.getElementById("my-react-app"));
    root.render(<TodoApp />);
}

main();


