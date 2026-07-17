import Navbar from "../components/Navbar";
import "./MyBids.css";

function MyBids() {
  const bids = [
    {
      id: 1,
      title: "Gaming Laptop",
      myBid: "$860",
      currentBid: "$860",
      status: "Winning",
      end: "15 Jul 2026",
      image: "https://bigbyte.com.np/wp-content/uploads/2025/07/Competitive-pricing-on-gaming-laptops-in-Nepal-600x600.jpg"
    },
    // {
    //   id: 2,
    //   title: "iPhone 15 Pro",
    //   myBid: "$690",
    //   currentBid: "$720",
    //   status: "Outbid",
    //   end: "18 Jul 2026",
    //   image: "https://via.placeholder.com/300x200"
    // },
    // {
    //   id: 3,
    //   title: "Canon DSLR Camera",
    //   myBid: "$460",
    //   currentBid: "$460",
    //   status: "Winning",
    //   end: "14 Jul 2026",
    //   image: "https://via.placeholder.com/300x200"
    // },
    // {
    //   id: 4,
    //   title: "PlayStation 5",
    //   myBid: "$500",
    //   currentBid: "$540",
    //   status: "Outbid",
    //   end: "16 Jul 2026",
    //   image: "https://via.placeholder.com/300x200"
    // },
    // {
    //   id: 5,
    //   title: "Mountain Bike",
    //   myBid: "$400",
    //   currentBid: "$400",
    //   status: "Won",
    //   end: "9 Jul 2026",
    //   image: "https://via.placeholder.com/300x200"
    // },
    // {
    //   id: 6,
    //   title: "Apple Watch",
    //   myBid: "$210",
    //   currentBid: "$235",
    //   status: "Outbid",
    //   end: "20 Jul 2026",
    //   image: "https://via.placeholder.com/300x200"
    // }
  ];

  const getStatusClass = (status) => {
    if (status === "Winning") return "status winning";
    if (status === "Outbid") return "status outbid";
    if (status === "Won") return "status won";
    return "status";
  };
return (
    <>
        <Navbar />
        <div className="mybids-page">

        <div className="mybids-header">
          <h1>My Bids</h1>
          <p>Track the auctions you've participated in.</p>
        </div>

        <div className="search-filter">

          <input
            type="text"
            placeholder="Search your bids..."
          />

          <select>
            <option>All Status</option>
            <option>Winning</option>
            <option>Outbid</option>
            <option>Won</option>
          </select>
        </div>
        <div className="auction-grid">

          {bids.map((item) => (

            <div className="auction-card" key={item.id}>

              <img src={item.image} alt={item.title} />

              <h3>{item.title}</h3>

              <h2>{item.currentBid}</h2>

              <span className={getStatusClass(item.status)}>
                {item.status}
              </span>

              <div className="dates">
                <p><strong>My Bid:</strong> {item.myBid}</p>
                <p><strong>Ends:</strong> {item.end}</p>
              </div>

              <button>View Auction</button>

            </div>

          ))}

        </div>

      </div>

    </> 
);
}


export default MyBids;
