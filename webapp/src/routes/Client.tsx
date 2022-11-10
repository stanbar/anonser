import { Link } from 'react-router-dom';

function Client() {
  return (
    <nav>
      <ul>
        <li>
          <Link to={`new`}>Start new provision</Link>
        </li>
        <li>
          <Link to={`status`}>Check provision status</Link>
        </li>
      </ul>
    </nav>
  );
}

export default Client;
