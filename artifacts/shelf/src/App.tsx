import Home from "./app/page";
import { Route, Switch } from "wouter";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route><main><h1>Page not found</h1><a href="/">Back to Shelf</a></main></Route>
    </Switch>
  );
}
