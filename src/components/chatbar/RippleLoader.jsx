import React from 'react';
import styled from 'styled-components';

const StyledWrapper = styled.div`
  .loader {
    --cell-size: 14px;
    --cell-spacing: 2px;
    --cells: 3;
    --total-size: calc(var(--cells) * (var(--cell-size) + 2 * var(--cell-spacing)));
    display: flex;
    flex-wrap: wrap;
    width: var(--total-size);
    height: var(--total-size);
  }

  .cell {
    flex: 0 0 var(--cell-size);
    margin: var(--cell-spacing);
    background-color: transparent;
    box-sizing: border-box;
    border-radius: 3px;
    animation: 1.5s ripple ease infinite;
  }

  .cell.d-1 { animation-delay: 100ms; }
  .cell.d-2 { animation-delay: 200ms; }
  .cell.d-3 { animation-delay: 300ms; }
  .cell.d-4 { animation-delay: 400ms; }

  .cell:nth-child(1) { --cell-color: #7B0D0E; }
  .cell:nth-child(2) { --cell-color: #8E1010; }
  .cell:nth-child(3) { --cell-color: #991212; }
  .cell:nth-child(4) { --cell-color: #A31314; }
  .cell:nth-child(5) { --cell-color: #AA1416; }
  .cell:nth-child(6) { --cell-color: #B51618; }
  .cell:nth-child(7) { --cell-color: #C0181A; }
  .cell:nth-child(8) { --cell-color: #CB1A1C; }
  .cell:nth-child(9) { --cell-color: #D81C1E; }

  @keyframes ripple {
    0%   { background-color: transparent; }
    30%  { background-color: var(--cell-color); }
    60%  { background-color: transparent; }
    100% { background-color: transparent; }
  }
`;

const RippleLoader = () => (
  <StyledWrapper>
    <div className="loader">
      <div className="cell d-0" />
      <div className="cell d-1" />
      <div className="cell d-2" />
      <div className="cell d-1" />
      <div className="cell d-2" />
      <div className="cell d-2" />
      <div className="cell d-3" />
      <div className="cell d-3" />
      <div className="cell d-4" />
    </div>
  </StyledWrapper>
);

export default RippleLoader;
