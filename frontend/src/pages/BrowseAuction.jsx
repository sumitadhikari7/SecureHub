import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {socket} from "../socket";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./BrowseAuction.css";

function BrowseAuction() {

  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();


  useEffect(() => {

    const fetchAuctions = async () => {

      try {

        const response = await fetch(
          "http://localhost:5000/api/auctions"
        );


        if (!response.ok) {
          throw new Error(
            `Server responded with ${response.status}`
          );
        }


        const data = await response.json();

        console.table(
          data.map((auction)=>({
            title: auction.title,
            start: auction.start_time,
            end: auction.end_time,
            status: auction.status
          }))
        );


        setAuctions(data);


      } catch(err){

        console.error(
          "Failed to fetch auctions:",
          err
        );

        setError(
          "Couldn't load auctions. Please try again later."
        );


      } finally {

        setLoading(false);

      }

    };


    fetchAuctions();

  }, []);



  const handleViewAuction = (auctionId) => {

    navigate(`/auction/${auctionId}`);

  };



  const sortedAuctions = [...auctions].sort((a,b)=>{

    const now = new Date();

    const aEnded =
      new Date(a.end_time) <= now;

    const bEnded =
      new Date(b.end_time) <= now;


    if(aEnded && !bEnded)
      return 1;


    if(!aEnded && bEnded)
      return -1;


    return (
      new Date(a.end_time)
      -
      new Date(b.end_time)
    );

  });



  return (

    <>

      <Navbar />


      <div className="browse-page">


        <div className="browse-header">

          <h1>
            Browse Auctions
          </h1>

          <p>
            Discover active auctions and place your bids.
          </p>

        </div>



        <div className="search-filter">

          <input
            type="text"
            placeholder="Search auctions..."
          />


          <select>

            <option>
              All Categories
            </option>

            <option>
              Electronics
            </option>

            <option>
              Vehicles
            </option>

          </select>

        </div>



        <div className="auction-grid">


          {loading ? (

            <p>
              Loading auctions...
            </p>


          ) : error ? (

            <p className="error-message">
              {error}
            </p>


          ) : auctions.length > 0 ? (


            sortedAuctions.map((item)=>(

              <div
                className="auction-card"
                key={item.auction_id}
              >


                <img
                  src={
                    item.image_url ||
                    "https://via.placeholder.com/300x200"
                  }
                  alt={item.title}
                />


                <h3>
                  {item.title}
                </h3>


                <h2>
                  $
                  {
                    item.current_price ||
                    item.starting_price
                  }
                </h2>



                <span
                  className={`status status-${item.status}`}
                >

                  {item.status === "active" &&
                    "LIVE AUCTION"
                  }

                  {item.status === "upcoming" &&
                    "UPCOMING"
                  }

                  {item.status === "ended" &&
                    "ENDED"
                  }

                </span>



                <div className="dates">

                  <p>
                    <strong>
                      Starts:
                    </strong>{" "}
                    {
                      new Date(
                        item.start_time
                      ).toLocaleString()
                    }
                  </p>


                  <p>
                    <strong>
                      Ends:
                    </strong>{" "}
                    {
                      new Date(
                        item.end_time
                      ).toLocaleString()
                    }
                  </p>

                </div>



                <button
                  onClick={() =>
                    handleViewAuction(
                      item.auction_id
                    )
                  }
                >
                  View Auction
                </button>


              </div>

            ))


          ) : (

            <p>
              No auctions found.
            </p>

          )}


        </div>



      


      </div>
      <Footer />

    </>

  );

}


export default BrowseAuction;