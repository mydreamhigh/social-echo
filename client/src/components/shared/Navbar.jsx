import { useState } from "react";
import Logo from "../../assets/SocialEcho.png";
import { Link } from "react-router-dom";
import Search from "./Search";
import { memo } from "react";
import ButtonLoadingSpinner from "../loader/ButtonLoadingSpinner";
import { logoutAction } from "../../redux/actions/authActions";
import { useDispatch } from "react-redux";

const Navbar = ({ userData }) => {
  const dispatch = useDispatch();
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const handleProfileClick = () => {
    setShowProfileInfo(!showProfileInfo);
  };
  const logout = async () => {
    setLoggingOut(true);
    await dispatch(logoutAction());
    setLoggingOut(false);
  };
  return (
    <nav className="flex items-center justify-between p-2 bg-white border-b border-gray-200 sticky top-0 mx-40">
      <div className="flex items-center">
        <Link to="/" className="w-36 h-full object-contain">
          <img src={Logo} alt="" />
        </Link>
      </div>
      <Search />
      <div className="relative z-30 ">
        <img
          src={userData.avatar}
          alt="profile"
          className="h-8 w-8 rounded-full cursor-pointer"
          onClick={handleProfileClick}
        />
        {showProfileInfo && (
          <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center">
              <img
                className="w-12 h-12 rounded-full mr-4"
                src={userData.avatar}
                alt={userData.name}
              />
              <div className="flex flex-col">
                <p className="font-medium text-gray-800">{userData.name}</p>
                <p className="text-gray-600">{userData.email}</p>
              </div>
            </div>
            <hr className="my-2 border-gray-300" />
            <button
              disabled={loggingOut}
              className="px-4 py-1 bg-red-500 hover:bg-red-600 transition duration-500 text-white rounded-lg"
              onClick={logout}
            >
              {loggingOut ? (
                <ButtonLoadingSpinner loadingText={"Logging out..."} />
              ) : (
                "Logout"
              )}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default memo(Navbar);
