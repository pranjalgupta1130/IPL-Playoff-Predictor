import { IMatch } from "../models/Match";
import { IPrediction } from "../models/Prediction";

export type DerivedUniverse = {
  baseline: {
    completedMatches1to50: IMatch[];
    upcomingMatches51to70: IMatch[];
  };
  simulationUniverse: {
    upcomingMatches51to70: IMatch[];
    predictionsForUpcoming: IPrediction[];
  };
};

