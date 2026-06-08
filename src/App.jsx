import { useEffect, useState } from "react";
import "./App.css";

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const places = [
  { name: "여의도 한강공원", city: "Seoul", desc: "돗자리·피크닉 이용이 많은 대표 한강공원" },
  { name: "뚝섬 한강공원", city: "Seoul", desc: "잔디광장과 강변 이용객이 많은 지역" },
  { name: "난지캠핑장", city: "Seoul", desc: "비 온 뒤 지면 상태 확인이 중요한 캠핑장" },
  { name: "잠원 한강공원", city: "Seoul", desc: "강변 산책·피크닉 수요가 높은 장소" },
  { name: "반포 한강공원", city: "Seoul", desc: "돗자리 이용객이 많은 한강공원" },
];

function App() {
  const [selected, setSelected] = useState(places[0]);
  const [weather, setWeather] = useState(null);
  const [ground, setGround] = useState(null);
  const [loading, setLoading] = useState(false);

  const calcGroundStatus = ({ temp, humidity, wind, clouds, rainNow }) => {
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

    score = Math.max(0, Math.min(100, score));

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

  const fetchWeather = async () => {
    setLoading(true);

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${selected.city}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.cod !== 200) {
        alert("날씨 정보를 불러오지 못했어.");
        return;
      }

      const info = {
        temp: data.main.temp,
        humidity: data.main.humidity,
        wind: data.wind.speed,
        clouds: data.clouds.all,
        rainNow: data.rain?.["1h"] || 0,
        description: data.weather[0].description,
      };

      setWeather(info);
      setGround(calcGroundStatus(info));
    } catch (error) {
      console.error(error);
      alert("API 연결 중 오류가 발생했어.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [selected]);

  return (
    <div className="app">
      <header className="hero">
        <p className="badge">Weather × Outdoor Safety</p>
        <h1>바닥 축축햇!</h1>
        <p>
          비가 그친 뒤에도 땅이 젖어 있으면 돗자리나 텐트 설치가 어렵습니다.
          현재 날씨의 습도, 햇빛, 바람, 강수 상태를 바탕으로 한강공원과 캠핑장의
          지면 마름 정도를 예측합니다.
        </p>
      </header>

      <main className="container">
        <section className="place-card">
          <h2>장소 선택</h2>
          <div className="place-grid">
            {places.map((place) => (
              <button
                key={place.name}
                className={selected.name === place.name ? "place active" : "place"}
                onClick={() => setSelected(place)}
              >
                <strong>{place.name}</strong>
                <span>{place.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {weather && ground && (
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
              <h2>추가 안전 기능</h2>
              <p>
                강변 공원이나 캠핑장은 비가 그친 뒤에도 상류 강수, 습도, 바람 상태에
                따라 지면이 늦게 마를 수 있습니다. 향후 공공데이터 API를 연결하면
                수위 변화와 침수 위험도까지 함께 안내할 수 있습니다.
              </p>

              <div className="process">
                <div>최근 강수 확인</div>
                <div>습도·바람 분석</div>
                <div>햇빛 조건 반영</div>
                <div>지면 이용 판단</div>
              </div>
            </section>
          </>
        )}

        {loading && <p className="loading">날씨 데이터를 분석하는 중...</p>}
      </main>
    </div>
  );
}

export default App;