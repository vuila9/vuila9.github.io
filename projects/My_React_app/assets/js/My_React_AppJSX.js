function TodoApp() {
    //might need to make these global
    const [todos, setTodos] = React.useState([]);
    const [input, setInput] = React.useState("");
    const [deadlines, setDeadlines] = React.useState("");

    const addTodo = () => {
        if (!input.trim()) return;
        //need to convert deadlines into total of seconds
        setTodos([...todos, {task: input.trim(), due: deadlines.trim() ? deadlines.trim() : '', dateObj: Date.now() + deadlines.trim()}]);
        setInput("");
        setDeadlines("");
    };

    const removeTodo = (index) => {
        setTodos(todos.filter((_, i) => i !== index));
    };

    return (
        <div style={{ padding: "20px", maxWidth: "100%", margin: "auto" }}>
            <div style={{ display: "flex", gap: "10px" }}>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Add a new task"
                style={{ flex: "1", padding: "5px" }}
            />
            <input
                type="text"
                value={deadlines}
                onChange={(e) => setDeadlines(e.target.value)}
                placeholder="Set deadline (dd.hh.mm.ss)"
                style={{ flex: "1", padding: "5px" }}
            />
            <button onClick={addTodo} style={{ width: '60px' }} className="fas fa-plus"></button>
            </div>
            <ul>
            {todos.map((todo, index) => (
                <li
                key={index}
                style={{
                    maxWidth: '100%',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                }}>
                <span style={{ color: 'blue', fontWeight: 'bold' }} className="todo-task">{todo.task}</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: 'red', fontWeight: 'bold', marginRight: '10px' }} className="todo-due">{todo.due}</span>
                    <button  style={{ width: '60px' }} className="fas fa-minus"
                        title="Remove task (right-click to mark complete)"
                        onClick={() => removeTodo(index)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            const taskElement = document.querySelectorAll('.todo-task')[index];
                            const dueElement = document.querySelectorAll('.todo-due')[index];
                            taskElement.style.textDecoration = taskElement.style.textDecoration === 'line-through' ? 'none' : 'line-through';
                            dueElement.style.textDecoration = dueElement.style.textDecoration === 'line-through' ? 'none' : 'line-through';
                        }}
                    ></button>
                </div>
                </li>
            ))}
            </ul>
        </div>
    );
}

function updateCounters() {
    const timers = document.querySelectorAll('.todo-due');
}

function main() {
    //const root = ReactDOM.createRoot(document.getElementById("my-react-app"));
    //root.render(<TodoApp/>);
    ReactDOM.render(<TodoApp />, document.getElementById("my-react-app"));
    // let intervalId;
    // updateCounters();
    // intervalId = setInterval(updateCounters, 1000);
}

main();


