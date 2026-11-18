
import { StyleSheet } from 'react-native';
import { colors } from './colors';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* HEADER */

  header: {
    height: 58,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerBack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  headerPlaceholder: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* SCROLL */

  scrollContent: {
    padding: 16,
    paddingBottom: 125,
  },

  /* CARDS */

  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 17,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },

  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 19,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* PRICE */

  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  priceLabel: {
    color: '#817D9C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },

  priceLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  price: {
    fontSize: 27,
    fontWeight: '900',
    color: colors.primary,
  },

  seatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EDFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  seatsText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
  },

  /* JOURNEY */

  journeyContainer: {
    flexDirection: 'row',
    minHeight: 112,
  },

  journeyIconColumn: {
    width: 25,
    alignItems: 'center',
    paddingTop: 5,
  },

  originDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#E8E3FF',
  },

  journeyLine: {
    width: 2,
    height: 48,
    backgroundColor: colors.border,
  },

  destinationDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: '#FAE9FF',
  },

  journeyTextColumn: {
    flex: 1,
    paddingLeft: 11,
  },

  locationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9692AD',
    letterSpacing: 1,
    marginBottom: 5,
  },

  locationName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  destinationBlock: {
    marginTop: 27,
  },

  /* DEPARTURE */

  departureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EFEDF8',
    paddingTop: 15,
    marginTop: 15,
  },

  departureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0EDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  departureLabel: {
    color: '#9692AD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  departureText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  /* SECTION HEADERS */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F0EDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: '#9692AD',
    marginTop: 4,
  },

  /* DETAIL ROWS */

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEF8',
  },

  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },

  detailLabel: {
    color: '#817D9C',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 9,
    flexShrink: 1,
  },

  detailValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    flex: 1,
  },

  /* DRIVER */

  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  driverIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: '#F0EDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  driverText: {
    flex: 1,
    marginLeft: 13,
  },

  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0EDFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 7,
  },

  driverStatus: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
    textTransform: 'capitalize',
  },

  /* VEHICLE */

  vehicleImage: {
    width: '100%',
    height: 175,
    borderRadius: 14,
    backgroundColor: colors.background,
    marginBottom: 13,
  },

  vehicleImageFallback: {
    width: '100%',
    height: 145,
    borderRadius: 14,
    backgroundColor: '#F0EDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  vehicleName: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 9,
  },

  vehicleTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0EDFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  vehicleTypeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 6,
  },

  vehicleQuickInfo: {
    flexDirection: 'row',
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#F0EEF8',
  },

  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 22,
  },

  quickInfoText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    marginLeft: 7,
  },

  descriptionContainer: {
    paddingTop: 17,
    marginTop: 5,
  },

  vehicleDescription: {
    fontSize: 13,
    lineHeight: 21,
    color: '#625E7D',
    marginTop: 10,
  },

  /* EXPAND BUTTON */

  expandButton: {
    backgroundColor: '#EFECFF',
    borderWidth: 1,
    borderColor: '#D9D2FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  expandButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  expandIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  expandTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
  },

  expandSubtitle: {
    fontSize: 10,
    color: '#77718F',
    marginTop: 4,
  },

  /* MAP TABS */

  locationTabs: {
    flexDirection: 'row',
    backgroundColor: '#F0EEF8',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },

  locationTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 9,
  },

  activeLocationTab: {
    backgroundColor: colors.primary,
  },

  locationTabText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
    marginLeft: 6,
  },

  activeLocationTabText: {
    color: colors.white,
  },

  /* MAP */

  mapContainer: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EFECFF',
  },

  map: {
    width: '100%',
    height: '100%',
  },

  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  fallbackText: {
    color: '#817D9C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 9,
  },

  mapCaption: {
    color: '#817D9C',
    fontSize: 11,
    marginTop: 10,
  },

  /* LOADING */

  loadingContainer: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#817D9C',
    fontSize: 12,
    marginLeft: 10,
  },

  /* ERRORS */

  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF0F0',
    padding: 14,
    borderRadius: 12,
    marginBottom: 15,
  },

  errorNoticeText: {
    color: colors.error,
    fontSize: 12,
    flex: 1,
    marginLeft: 9,
  },

  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 25,
  },

  errorTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text,
    marginTop: 14,
  },

  errorMessage: {
    fontSize: 13,
    color: '#817D9C',
    textAlign: 'center',
    marginTop: 8,
  },

  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 20,
  },

  backButtonText: {
    color: colors.white,
    fontWeight: '800',
  },

  /* FIXED BOOKING BAR */

  bookingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 25,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  bookingPrice: {
    flex: 1,
  },

  bookingPriceLabel: {
    color: '#9692AD',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  bookingPriceValue: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 4,
  },

  bookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 19,
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 175,
    elevation: 3,
    shadowColor: colors.secondary,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  disabledBookButton: {
    backgroundColor: '#9692AD',
  },

  bookButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    marginRight: 9,
  },

  bottomSpace: {
    height: 10,
  },
});

export default styles;
