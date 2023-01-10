import { Button } from '@mui/material';

function Client() {
  return (
    <ul>
      <li>
        <Button href="new" variant="contained">
          Start new provision
        </Button>
      </li>
      <li>
        <Button href="status" variant="contained">
          Check provision status
        </Button>
      </li>
    </ul>
  );
}

export default Client;
