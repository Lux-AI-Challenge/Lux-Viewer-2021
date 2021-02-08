import 'phaser';
import React, { useEffect, useState } from 'react';
import classnames from 'classnames';
import MainScene, { Frame, FrameTileData } from '../scenes/MainScene';
import { createGame } from '../game';
import {
  Button,
  CircularProgress,
  ButtonGroup,
  Card,
  CardContent,
  Slider,
  IconButton,
  Switch,
  FormControlLabel,
  createMuiTheme,
  makeStyles,
  ThemeProvider,
  createStyles,
  FormGroup,
} from '@material-ui/core';
import './styles.css';
import { LuxMatchConfigs } from '@lux-ai/2020-challenge/lib/es6';
import TileStats from './TileStats';
import { hashToMapPosition, mapCoordsToIsometricPixels } from '../scenes/utils';
import GlobalStats from './GlobalStats';
import Controller from './Controller';
import ZoomInOut from './ZoomInOut';
import UploadSVG from '../icons/upload.svg';

export type GameComponentProps = {
  // replayData?: any;
};

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#fea201',
    },
    secondary: {
      main: '#3686FF',
    },
  },
});

export const GameComponent = () => {
  const [notifWindowOpen, setNotifWindowOpen] = useState(false);
  const [replayData, setReplayData] = useState(null);
  const [notifMsg, setNotifMsg] = useState('');
  const [running, setRunning] = useState(false);
  const [playbackSpeed, _setPlaybackSpeed] = useState(1);
  const setPlaybackSpeed = (speed: number) => {
    if (speed >= 0.5 && speed <= 16) {
      _setPlaybackSpeed(speed);
      main.speed = speed;
    }
  };
  const [visualScale, _setVisualScale] = useState(0.5);
  const setVisualScale = (scale: number) => {
    if (scale >= 0.25 && scale <= 2) {
      _setVisualScale(scale);
    }
  };
  const [isReady, setReady] = useState(false);
  const [selectedTileData, setTileData] = useState<FrameTileData>(null);
  const [game, setGame] = useState<Phaser.Game>(null);
  const [main, setMain] = useState<MainScene>(null);
  const [configs, setConfigs] = useState<LuxMatchConfigs>(null);
  const [sliderConfigs, setSliderConfigs] = useState({
    step: 1,
    min: 0,
    max: 1000,
  });
  useEffect(() => {
    if (game) {
      game.events.on('setup', () => {
        const main: MainScene = game.scene.scenes[0];
        setMain(main);
        const configs = main.luxgame.configs;
        setConfigs(configs as LuxMatchConfigs);

        setSliderConfigs({
          min: 0,
          max: configs.parameters.MAX_DAYS,
          step: 1,
        });
        setReady(true);
      });
    }
  }, [game]);

  useEffect(() => {
    if (running && configs) {
      let currTurn = turn;
      const interval = setInterval(() => {
        if (currTurn >= configs.parameters.MAX_DAYS) {
          setRunning(false);
          return;
        }
        moveToTurn(currTurn);
        currTurn += 1;
        setTurn(currTurn);
      }, 1000 / playbackSpeed);
      return () => clearInterval(interval);
    }
  }, [running, playbackSpeed]);

  useEffect(() => {
    if (isReady) {
      moveToTurn(0);
    }
  }, [isReady]);
  useEffect(() => {
    if (main && visualScale) {
      main.overallScale = visualScale;
      if (main.activeImageTile) {
        // main.activeImageTile.setY(main.originalTileY);
        // main.activeImageTile.clearTint();
        // main.activeImageTile = null;
        // main.originalTileY
      }
      // move to current turn to rerender all objects appropriately
      moveToTurn(turn);
      // TODO: do a on scale change instead inside main
      main.floorImageTiles.forEach((tileImage, hash) => {
        const pos = hashToMapPosition(hash);
        const ps = mapCoordsToIsometricPixels(pos.x, pos.y, {
          scale: main.overallScale,
          width: main.mapWidth,
          height: main.mapHeight,
        });
        tileImage.setScale(main.defaultScales.block * main.overallScale);
        tileImage.setX(ps[0]);
        tileImage.setY(ps[1]);
        if (tileImage == main.activeImageTile) {
          main.originalTileY = tileImage.y;
        }
        if (tileImage == main.hoverImageTile) {
          main.originalHoverImageTileY = tileImage.y;
        }
      });
    }
  }, [main, visualScale]);
  const [turn, setTurn] = useState(0);
  const [currentFrame, setFrame] = useState<Frame>(null);
  const [uploading, setUploading] = useState(false);
  const handleSliderChange = (_event: any, newValue: number) => {
    moveToTurn(newValue);
  };
  const fileInput = React.createRef<HTMLInputElement>();
  const moveToTurn = (turn: number) => {
    setTurn(turn);
    main.renderFrame(turn);
    setFrame(main.frames[turn]);
  };
  const handleUpload = () => {
    setUploading(true);
    if (fileInput.current.files.length) {
      const file = fileInput.current.files[0];
      const name = file.name;
      const meta = name.split('.');

      if (meta[meta.length - 1] === 'json') {
        file
          .text()
          .then(JSON.parse)
          .then((data) => {
            if (game) {
              game.destroy(true, false);
            }
            setReady(false);
            setReplayData(data);
            const newgame = createGame({
              replayData: data,
              handleUnitClicked,
              handleTileClicked,
            });
            setGame(newgame);
            setUploading(false);
          });
      }
    }
  };
  useEffect(() => {
    if (replayData) {
      const newgame = createGame({
        replayData: replayData,
        handleUnitClicked,
        handleTileClicked,
      });
      setGame(newgame);
      setUploading(false);
    }
  }, [replayData]);
  const noUpload = !uploading && game === null;
  const gameLoading =
    (uploading && game === null) || (!isReady && game !== null);

  const handleUnitClicked = (data) => {
    console.log(data);
  };
  const handleTileClicked = (data) => {
    setTileData(data);
  };

  const [debugOn, _setDebug] = useState(true);
  const setDebug = (
    e: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    _setDebug(checked);
    main.debug = checked;
    moveToTurn(turn);
  };
  const renderDebugModeButton = () => {
    return (
      <FormGroup row className="debug-mode-button-wrapper">
        <FormControlLabel
          control={
            <Switch checked={debugOn} onChange={setDebug} name="checkedA" />
          }
          label="Debug Mode"
        />
      </FormGroup>
    );
  };

  if (replayData) {
    console.log(replayData);
  }
  return (
    <div className="Game">
      <ThemeProvider theme={theme}>
        <div id="content"></div>
        {!isReady && (
          <div className="upload-no-replay-wrapper">
            <div>
              <Button
                className="upload-btn"
                color="secondary"
                variant="contained"
                onClick={() => {
                  fileInput.current.click();
                }}
              >
                <span className="upload-text">Upload a replay</span>
                <img className="upload-icon-no-replay" src={UploadSVG} />
              </Button>
              <p></p>
              <input
                accept=".json, .luxr"
                type="file"
                style={{ display: 'none' }}
                onChange={handleUpload}
                ref={fileInput}
              />
            </div>
          </div>
        )}
        {isReady && (
          <div>
            <Controller
              turn={turn}
              moveToTurn={moveToTurn}
              handleUpload={handleUpload}
              running={running}
              isReady={isReady}
              setRunning={setRunning}
              playbackSpeed={playbackSpeed}
              setPlaybackSpeed={setPlaybackSpeed}
              fileInput={fileInput}
              sliderConfigs={sliderConfigs}
              handleSliderChange={handleSliderChange}
            />
            <div className="tile-stats-wrapper">
              {selectedTileData ? (
                <TileStats
                  {...selectedTileData}
                  cities={currentFrame.cityData}
                />
              ) : (
                <TileStats empty />
              )}
            </div>
            <div className="global-stats-wrapper">
              {main && (
                <GlobalStats
                  currentFrame={currentFrame}
                  turn={turn}
                  accumulatedStats={main.accumulatedStats}
                  teamDetails={replayData.teamDetails}
                  staticGlobalStats={main.globalStats}
                />
              )}
            </div>
            {renderDebugModeButton()}
            <ZoomInOut
              className="zoom-in-out"
              handleZoomIn={() => {
                setVisualScale(visualScale + 0.25);
              }}
              handleZoomOut={() => {
                setVisualScale(visualScale - 0.25);
              }}
            />
          </div>
        )}
      </ThemeProvider>
    </div>
  );
};
