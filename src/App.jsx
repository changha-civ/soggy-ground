import { useEffect, useState } from "react";
import "./App.css";

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY;

const defaultPlaces = [
  {
    name: "여의도 한강공원",
    lat: 37.5284,
    lon: 126.9349,
    desc: "돗자리·피크닉 이용이 많은 대표 한강공원",
    type: "river",
    groundBonus: 4,
  },
  {
    name: "뚝섬 한강공원",
    lat: 37.5296,
    lon: 127.0705,
    desc: "잔디광장과 강변 이용객이 많은 지역",
    type: "river",
    groundBonus: 1,
  },
  {
    name: "난지캠핑장",
    lat: 37.5683,
    lon: 126.8737,
    desc: "비 온 뒤 지면 상태 확인이 중요한 캠핑장",
    type: "camping",
    groundBonus: -10,
  },
  {
    name: "잠원 한강공원",
    lat: 37.5207,
    lon: 127.0121,
    desc: "강변 산책·피크닉 수요가 높은 장소",
    type: "river",
    groundBonus: 2,
  },
  {
    name: "반포 한강공원",
    lat: 37.5106,
    lon: 126.9959,
    desc: "돗자리 이용객이 많은 한강공원",
    type: "river",
    groundBonus: 5,
  },
];

function App() {
  const [selected, setSelected] = useState(defaultPlaces[0]);
  const [weather, setWeather] = useState(null);
  const [ground, setGround] = useState(null);
  const [safety, setSafety] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const guessPlaceType = (name) => {
    const text = name.toLowerCase();

    if (text.includes("캠핑") || text.includes("야영")) {
      return { type: "camping", groundBonus: -10, desc: "캠핑·야영 이용 가능성이 있는 장소" };
    }

    if (text.includes("한강") || text.includes("강") || text.includes("하천")) {
      return { type: "river", groundBonus: -3, desc: "강변에 가까워 지면·수위 확인이 필요한 장소" };
    }

    if (text.includes("공원") || text.includes("숲")) {
      return { type: "park", groundBonus: 0, desc: "잔디·흙길 이용 가능성이 있는 야외 장소" };
    }

    return { type: "outdoor", groundBonus: 0, desc: "검색한 야외 장소" };
  };

  const calcGroundStatus = ({ temp, humidity, wind, clouds, rainNow, groundBonus }) => {
    let score = 70;

    if (rainNow > 0) score -= 35;

    if (humidity >= 85) score -= 25;
    else if (humidity >= 70) score -= 15;
    else if (humidity <= 50) score += 10;

    if (clouds >= 80) score -= 15;
    else if (clouds <= 35) score += 15;

    if (wind >= 4) score += 15;
    else if (wind >= 2) score += 8;

    if (temp >= 24) score += 10;
    else if (temp <= 15) score -= 10;

    score += groundBonus || 0;
    score = Math.max(0, Math.min(100, Math.round(score)));

    if (score >= 75) {
      return {
        score,
        level: "이용 가능",
        emoji: "🌤️",
        text: "땅이 비교적 잘 말랐을 가능성이 높아요.",
        advice: "돗자리나 피크닉은 가능하지만, 그늘진 곳은 한 번 확인하는 게 좋아요.",
        className: "good",
      };
    }

    if (score >= 50) {
      return {
        score,
        level: "주의 필요",
        emoji: "🌥️",
        text: "겉은 말라 보여도 일부 잔디나 흙바닥은 축축할 수 있어요.",
        advice: "방수 돗자리나 두꺼운 매트를 준비하는 걸 추천해요.",
        className: "normal",
      };
    }

    if (score >= 30) {
      return {
        score,
        level: "축축함",
        emoji: "💧",
        text: "습도나 흐림 상태 때문에 땅이 아직 덜 말랐을 가능성이 있어요.",
        advice: "텐트 설치나 돗자리 이용은 불편할 수 있어요.",
        className: "warning",
      };
    }

    return {
      score,
      level: "이용 비추천",
      emoji: "🌧️",
      text: "비 또는 높은 습도로 인해 지면 상태가 좋지 않을 가능성이 높아요.",
      advice: "오늘은 실내 활동이나 포장된 산책로 이용을 추천해요.",
      className: "danger",
    };
  };

  const calcSafety = ({ selectedPlace, humidity, wind, clouds, rainNow }) => {
    let risk = 20;

    if (selectedPlace.type === "river") risk += 18;
    if (selectedPlace.type === "camping") risk += 14;
    if (rainNow > 0) risk += 35;
    if (humidity >= 80) risk += 15;
    if (clouds >= 80) risk += 8;
    if (wind >= 7) risk += 12;

    risk = Math.max(0, Math.min(100, Math.round(risk)));

    if (risk >= 70) {
      return {
        title: "강변 이용 주의",
        level: "높음",
        text: "강변이나 캠핑장 이용 시 지면 습기와 미끄럼 위험을 함께 확인해야 합니다.",
        className: "danger",
      };
    }

    if (risk >= 45) {
      return {
        title: "부분 주의",
        level: "보통",
        text: "일부 구역은 축축할 수 있어 방수 돗자리와 여벌 준비를 추천합니다.",
        className: "warning",
      };
    }

    return {
      title: "안전 양호",
      level: "낮음",
      text: "현재 조건에서는 야외 이용 위험이 비교적 낮은 편입니다.",
      className: "good",
    };
  };

  const fetchWeather = async (place = selected) => {
    setLoading(true);

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${place.lat}&lon=${place.lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.cod !== 200) {
        alert("날씨 정보를 불러오지 못했어. API 키를 확인해줘.");
        return;
      }

      const info = {
        temp: data.main.temp,
        humidity: data.main.humidity,
        wind: data.wind.speed,
        clouds: data.clouds.all,
        rainNow: data.rain?.["1h"] || 0,
        description: data.weather?.[0]?.description || "정보 없음",
        groundBonus: place.groundBonus || 0,
      };

      setWeather(info);
      setGround(calcGroundStatus(info));
      setSafety(calcSafety({ selectedPlace: place, ...info }));
    } catch (error) {
      console.error(error);
      alert("API 연결 중 오류가 발생했어.");
    } finally {
      setLoading(false);
    }
  };

  const searchPlace = async () => {
    if (!searchKeyword.trim()) return;

    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
          searchKeyword
        )}`,
        {
          headers: {
            Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
          },
        }
      );

      const data = await res.json();

      if (!data.documents || data.documents.length === 0) {
        alert("검색 결과가 없어. 다른 장소명으로 검색해줘.");
        return;
      }

      const results = data.documents.slice(0, 5).map((item) => {
        const guessed = guessPlaceType(item.place_name);

        return {
          name: item.place_name,
          lat: Number(item.y),
          lon: Number(item.x),
          address: item.road_address_name || item.address_name,
          desc: guessed.desc,
          type: guessed.type,
          groundBonus: guessed.groundBonus,
        };
      });

      setSearchResults(results);
    } catch (error) {
      console.error(error);
      alert("카카오 장소 검색 중 오류가 발생했어.");
    }
  };

  const selectPlace = (place) => {
    setSelected(place);
    fetchWeather(place);
  };

  useEffect(() => {
    fetchWeather(defaultPlaces[0]);
  }, []);

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="badge">날씨 × 장소 검색 × 야외 안전</p>
          <h1>바닥 축축햇!</h1>
        </div>
        <p>
          비가 그친 뒤에도 땅이 젖어 있으면 돗자리나 텐트 설치가 어렵습니다.
          장소 검색, 날씨 데이터, 습도·바람·강수 상태를 바탕으로 지면 마름 정도와
          야외 이용 안전도를 예측합니다.
        </p>
      </header>

      <main className="container">
        <section className="search-card">
          <h2>장소 검색</h2>
          <div className="search-row">
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchPlace();
              }}
              placeholder="예: 서울숲, 난지한강공원, 양평 캠핑장"
            />
            <button type="button" onClick={searchPlace}>
              검색
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((place) => (
                <button
                  key={`${place.name}-${place.lat}`}
                  type="button"
                  onClick={() => selectPlace(place)}
                >
                  <strong>{place.name}</strong>
                  <span>{place.address}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="place-card">
          <h2>추천 장소</h2>
          <div className="place-grid">
            {defaultPlaces.map((place) => (
              <button
                key={place.name}
                type="button"
                className={selected.name === place.name ? "place active" : "place"}
                onClick={() => selectPlace(place)}
              >
                <strong>{place.name}</strong>
                <span>{place.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {loading && <p className="loading">날씨 데이터를 분석하는 중...</p>}

        {weather && ground && safety && (
          <>
            <section className={`result-card ${ground.className}`}>
              <div>
                <span className="emoji">{ground.emoji}</span>
                <h2>{ground.level}</h2>
                <p>{ground.text}</p>
              </div>

              <div className="score-box">
                <p>땅 마름 점수</p>
                <strong>{ground.score}점</strong>
                <span>{ground.advice}</span>
              </div>
            </section>

            <section className={`safety-result ${safety.className}`}>
              <div>
                <h2>{safety.title}</h2>
                <p>{safety.text}</p>
              </div>
              <strong>위험도 {safety.level}</strong>
            </section>

            <section className="weather-grid">
              <div className="weather-card">
                <span>📍</span>
                <p>선택 장소</p>
                <strong>{selected.name}</strong>
              </div>

              <div className="weather-card">
                <span>🌡️</span>
                <p>기온</p>
                <strong>{Math.round(weather.temp)}℃</strong>
              </div>

              <div className="weather-card">
                <span>💦</span>
                <p>습도</p>
                <strong>{weather.humidity}%</strong>
              </div>

              <div className="weather-card">
                <span>🌬️</span>
                <p>바람</p>
                <strong>{weather.wind} m/s</strong>
              </div>

              <div className="weather-card">
                <span>☁️</span>
                <p>구름량</p>
                <strong>{weather.clouds}%</strong>
              </div>

              <div className="weather-card">
                <span>🌧️</span>
                <p>현재 강수량</p>
                <strong>{weather.rainNow} mm</strong>
              </div>
            </section>

            <section className="safety-card">
              <h2>구현된 안전 분석 기능</h2>
              <p>
                카카오 장소 검색으로 선택한 위치의 좌표를 가져오고, OpenWeather API의
                실시간 날씨 데이터를 이용해 지면 마름 점수와 강변 이용 안전도를
                계산합니다. 캠핑장, 강변, 공원 여부에 따라 장소별 보정값도 함께 반영합니다.
              </p>

              <div className="process">
                <div>장소 검색</div>
                <div>좌표 기반 날씨 조회</div>
                <div>지면 특성 보정</div>
                <div>안전도 판단</div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;