import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  header: {
    height: 58,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDF2',
  },

  headerBack: {
    width: 35,
    height: 35,
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172B4D',
  },

  headerPlaceholder: {
    width: 35,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EDF0F4',
  },

  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  priceLabel: {
    fontSize: 13,
    color: '#788697',
    marginBottom: 5,
  },

  price: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0F4C81',
  },

  seatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF3FA',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
  },

  seatsText: {
    color: '#0F4C81',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },

  journeyContainer: {
    flexDirection: 'row',
    minHeight: 105,
  },

  journeyIconColumn: {
    width: 24,
    alignItems: 'center',
    paddingTop: 5,
  },

  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F4C81',
  },

  journeyLine: {
    width: 2,
    height: 45,
    backgroundColor: '#CCD6E0',
  },

  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5A623',
  },

  journeyTextColumn: {
    flex: 1,
    paddingLeft: 10,
  },

  locationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A99A8',
    letterSpacing: 1,
    marginBottom: 4,
  },

  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#172B4D',
  },

  destinationBlock: {
    marginTop: 27,
  },

  departureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EDF0F4',
    paddingTop: 14,
    marginTop: 13,
  },

  departureText: {
    color: '#526477',
    fontSize: 13,
    marginLeft: 9,
    fontWeight: '500',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#172B4D',
    marginBottom: 16,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },

  detailLabel: {
    color: '#788697',
    fontSize: 13,
    flex: 1,
    marginRight: 10,
  },

  detailValue: {
    color: '#172B4D',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },

  locationTabs: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 13,
  },

  locationTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
  },

  activeLocationTab: {
    backgroundColor: '#0F4C81',
  },

  locationTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#526477',
    marginLeft: 6,
  },

  activeLocationTabText: {
    color: '#FFFFFF',
  },

  mapContainer: {
    width: '100%',
    height: 230,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E9EEF3',
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
    color: '#788697',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },

  mapCaption: {
    color: '#788697',
    fontSize: 11,
    marginTop: 10,
  },

  mapDescription: {
    color: '#788697',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 13,
  },

  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  driverIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EAF3FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  driverText: {
    marginLeft: 13,
  },

  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#172B4D',
  },

  driverStatus: {
    fontSize: 12,
    color: '#788697',
    marginTop: 5,
    textTransform: 'capitalize',
  },

  loadingContainer: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#788697',
    fontSize: 13,
    marginLeft: 10,
  },

  vehicleImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#E9EEF3',
    marginBottom: 14,
  },

  vehicleImageFallback: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#F0F3F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  vehicleName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#172B4D',
    marginBottom: 7,
  },

  descriptionContainer: {
    paddingTop: 14,
  },

  vehicleDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#526477',
    marginTop: 7,
  },

  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F0',
    padding: 13,
    borderRadius: 10,
    marginBottom: 15,
  },

  errorNoticeText: {
    color: '#B54745',
    fontSize: 12,
    flex: 1,
    marginLeft: 8,
  },

  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
    padding: 25,
  },

  errorTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#172B4D',
    marginTop: 14,
  },

  errorMessage: {
    fontSize: 13,
    color: '#788697',
    textAlign: 'center',
    marginTop: 8,
  },

  backButton: {
    backgroundColor: '#0F4C81',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 9,
    marginTop: 20,
  },

  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  bottomSpace: {
    height: 20,
  },
});

export default styles;