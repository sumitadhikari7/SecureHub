import Navbar from "../components/Navbar";
import './BrowseAuction.css';

function BrowseAuction() {
  const auctions = [
    {
      id: 1,
      title: "Gaming Laptop",
      price: "$850",
      status: "Current Bid",
      start: "10 Jul 2026",
      end: "15 Jul 2026",
      image: "https://bigbyte.com.np/wp-content/uploads/2025/07/Competitive-pricing-on-gaming-laptops-in-Nepal-600x600.jpg"
    },
    {
      id: 2,
      title: "iPhone 15 Pro",
      price: "$700",
      status: "Starting Price",
      start: "11 Jul 2026",
      end: "18 Jul 2026",
      image: "https://qualitycomputer.com.np/web/image/product.product/50748/image_1024/Apple%20iPhone%2015%20%28Black%2C%20128GB%29?unique=23046f0"
    },
    {
      id: 3,
      title: "Canon DSLR Camera",
      price: "$450",
      status: "Current Bid",
      start: "8 Jul 2026",
      end: "14 Jul 2026",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQd_pXy4aWe2m4ARs0jvJx_QvKEj7yNhpGdekDSEimus8kHcvLG8N7sN4&s=10"
    },
    // {
    //   id: 4,
    //   title: "PlayStation 5",
    //   price: "$520",
    //   status: "Current Bid",
    //   start: "9 Jul 2026",
    //   end: "16 Jul 2026",
    //   image: "https://via.placeholder.com/300x200"
    // },
    // {
    //   id: 5,
    //   title: "Apple Watch",
    //   price: "$220",
    //   status: "Starting Price",
    //   start: "12 Jul 2026",
    //   end: "20 Jul 2026",
    //   image: "https://via.placeholder.com/300x200"
    // },
    // {
    //   id: 6,
    //   title: "Mountain Bike",
    //   price: "$390",
    //   status: "Current Bid",
    //   start: "10 Jul 2026",
    //   end: "19 Jul 2026",
    //   image: "https://via.placeholder.com/300x200"
    // }
  ];

  return(
    <>
        <Navbar />
        <div className="browse-page">

        <div className="browse-header">
            <h1>Browse Auctions</h1>
            <p>Discover active auctions and place your bids.</p>
        </div>
        <div className="search-filter">

            <input
            type="text"
            placeholder="Search auctions..."
            />

            <select>
            <option>All Categories</option>
            <option>Electronics</option>
            <option>Vehicles</option>
            <option>Fashion</option>
            <option>Collectibles</option>
            </select>

        </div>
        <div className="auction-grid">

            {auctions.map((item) => (

            <div className="auction-card" key={item.id}>

                <img src={item.image} alt={item.title} />

                <h3>{item.title}</h3>

                <h2>{item.price}</h2>

                <span className="status">
                {item.status}
                </span>

                <div className="dates">
                <p><strong>Added:</strong> {item.start}</p>
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

export default BrowseAuction;

