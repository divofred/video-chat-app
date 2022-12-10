import Router from 'next/router';
export default function Home() {
  return (
    <>
      <div className="joinOuterContainer">
        <div className="joinInnerContainer">
          <h1 className="heading">Video chat app</h1>
          <div>
            <h3 className="joinInput">ID: 39439ddjdskjdf</h3>
            <button
              className="button"
              style={{ backgroundColor: '#c26a6a' }}
              disabled
              onClick={() => console.log('clicked')}
            >
              Pick Call
            </button>
          </div>
          <div>
            <input
              placeholder="Name"
              className="joinInput mt-20"
              type="text"
              required
            />
          </div>
          <div>
            <input
              placeholder="ID"
              className="joinInput mt-20"
              type="text"
              required
            />
          </div>
          <div>
            <button
              className="button mt-20"
              type="submit"
              onClick={() => Router.push('/room')}
            >
              Call
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
