import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

function Square(props) {
  let valClass = "";
  if (props.value === 1) {
    valClass = 'X';
  }
  if (props.value === 2) {
    valClass = 'O';
  }
  return (
    <div className={valClass + " circle"} onClick={props.onClick}>
    </div>
  );
}

function LastSquare(props) {
  let valClass = "";
  if (props.value === 1) {
    valClass = 'X';
  }
  if (props.value === 2) {
    valClass = 'O';
  }
  return (
    <div className={"last " + valClass + " circle"} onClick={props.onClick}>
    </div>
  );
}

function calculateWinner(squares) {
  return fetch('http://localhost:5000/api/iswinner/', {
    method: 'post',
    body: JSON.stringify({
      board: squares
    }),
    mode: 'cors',
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  })
    .then((response) => response.json())
    .then((responseJson) => {
      return responseJson.winner;
    })
    .catch((error) => {
      console.error(error);
      return 0;
    });
}


class Board extends React.Component {
  // constructor() {
  //   super();
  // }

  renderSquare(i, j) {
    return (<Square value={this.props.squares[i * 15 + j]}
      onClick={() => this.props.onClick(i, j)}
    />);
  }

  renderLastSquare(i, j) {
    return (<LastSquare value={this.props.squares[i * 15 + j]}
      onClick={() => this.props.onClick(i, j)}
    />);
  }

  render() {
    var boardSquare = []
    for (let i = 0; i < 15; i++) {
      var rowSquare = []
      for (let j = 0; j < 15; j++) {
        if (i === this.props.lastX && j === this.props.lastY) {
          rowSquare.push(this.renderLastSquare(i,j));
        }
        else{
          rowSquare.push(this.renderSquare(i, j));
        }
      }
      boardSquare.push(
        <div className="board-row">
          {rowSquare}
        </div>);
    }
    return (
      <div>
        {boardSquare}
      </div>
    );
  }
}

class Game extends React.Component {
  constructor() {
    super();
    const squares = Array(15 *15).fill(0);
    squares[112] = 2;
    this.state = {
      history: [{
        // squares: Array(15 * 15).fill(0),
        squares: squares,
        lastX: -1,
        lastY: -1,
      }],
      stepNumber: 0,
      xIsNext: true,
      blocked: false,
      winner: 0,
    };
  }

  handleClick(i, j) {
    const history = this.state.history.slice(0, this.state.stepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();
    if (squares[i * 15 + j] !== 0 || this.state.blocked || this.state.winner !== 0) {
      return;
    }
    squares[i * 15 + j] = this.state.xIsNext ? 1 : 2;
    this.setState({
      history: history.concat([{
        squares: squares,
        lastX: i,
        lastY: j,
      }]),
      stepNumber: history.length,
      xIsNext: !this.state.xIsNext,
      blocked: true
    });

    calculateWinner(squares).then((theWinner) => {
      this.setState({
        winner: theWinner
      })
      if (theWinner === 0) {
        this.makeNextMove(squares).then((responseJson) => {
          const history = this.state.history.slice(0, this.state.stepNumber + 1);
          const current = history[history.length - 1];
          const squares = current.squares.slice();
          squares[responseJson.x * 15 + responseJson.y] = this.state.xIsNext ? 1 : 2;
          this.setState({
            history: history.concat([{
              squares: squares,
              lastX: responseJson.x,
              lastY: responseJson.y,
            }]),
            stepNumber: history.length,
            xIsNext: !this.state.xIsNext,
            blocked: true
          });
          calculateWinner(squares).then((theWinner) => {
            this.setState({
              winner: theWinner,
              blocked: false
            })
          });
        })
      }
      else {
        this.setState({
          blocked: false
        })
      }
    })
  }

  makeNextMove(squares) {
    return fetch('http://localhost:5000/api/getnextmove/', {
      method: 'post',
      body: JSON.stringify({
        board: squares,
        cur: 2
      }),
      mode: 'cors',
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    })
      .then((response) => {
        return response.json()
      })
      .catch((error) => {
        console.error(error);
        this.setState({
          blocked: false,
        })
        this.retract(1);
      });
  }

  retract(steps) {
    if (this.blocked) {
      return;
    }
    if ((this.state.stepNumber - steps) >= 0) {
      this.setState({
        stepNumber: this.state.stepNumber - steps,
        xIsNext: ((this.state.stepNumber - steps) % 2) ? false : true,
      });
    }
  }

  restart() {
    this.setState({
      history: [{
        squares: Array(15 * 15).fill(0),
        lastX: -1,
        lastY: -1,
      }],
      stepNumber: 0,
      xIsNext: true,
      blocked: false,
      winner: 0,
    });
  }

  render() {
    const history = this.state.history;
    const current = history[this.state.stepNumber];

    let status;
    if (this.state.winner !== 0) {
      status = 'Winner: player ' + (this.state.winner === 1 ? 'Black' : 'White');
    } else {
      status = 'Next player: ' + (this.state.xIsNext ? 'Black' : 'White');
    }
    let wait;
    if (this.state.blocked && this.state.winner === 0) {
      wait = "Waiting....";
    }

    return (
      <div className="game">
        <div className="game-board">
          <Board
            lastX={current.lastX}
            lastY={current.lastY}
            squares={current.squares}
            onClick={(i, j) => this.handleClick(i, j)}
          />
        </div>
        <div className="game-info">
          <div>{status}</div>
          <button onClick={() => this.retract(2)}>Retract</button>
          <button onClick={() => this.restart()}>Restart</button>
          <div>{wait}</div>
        </div>
      </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
);
