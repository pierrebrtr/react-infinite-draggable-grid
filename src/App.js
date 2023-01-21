import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from "react-router-dom";
import GridWithLayout from "./GridWithLayout";
import Editor from "./Editor";

function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<GridWithLayout />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;