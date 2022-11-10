import { Link } from "react-router-dom";

function App() {

    return (
        <div className="App">
            <header className="App-header">
                <nav>
                    <ul>
                        <li>
                            <Link to={`client`}>Client</Link>
                        </li>
                        <li>
                            <Link to={`sp`}>Service Provider</Link>
                        </li>
                    </ul>
                </nav>
            </header>
        </div>
    );
}

export default App;
